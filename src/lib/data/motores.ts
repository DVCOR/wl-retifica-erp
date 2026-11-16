import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { normalizarPlaca, type FiltroMotores } from "@/lib/validacoes/motores";
import type { Database } from "@/lib/supabase/types";
import {
  enriquecerOs,
  SELECT_OS_HISTORICO,
  termoSeguro,
  type OsHistorico,
} from "@/lib/data/clientes";

/** Leitura do módulo Motores (server-only), com a sessão do usuário (RLS). */

export const POR_PAGINA_MOTORES = 20;

export type MotorCompleto = Database["public"]["Tables"]["motores"]["Row"];

export type MotorLinha = MotorCompleto & {
  cliente: { id: string; nome: string } | null;
};

export type MotorResumo = Pick<
  MotorCompleto,
  | "id"
  | "cliente_id"
  | "marca"
  | "modelo"
  | "codigo_motor"
  | "numero_serie"
  | "cilindros"
  | "valvulas_por_cilindro"
  | "veiculo_placa"
  | "veiculo_modelo"
  | "veiculo_ano"
>;

const SELECT_RESUMO =
  "id, cliente_id, marca, modelo, codigo_motor, numero_serie, cilindros, valvulas_por_cilindro, veiculo_placa, veiculo_modelo, veiculo_ano";

function condicoesBusca(termoBruto: string): string[] {
  const termo = termoSeguro(termoBruto);
  if (!termo) return [];
  const placa = normalizarPlaca(termo);
  const c = [
    `marca.ilike.%${termo}%`,
    `modelo.ilike.%${termo}%`,
    `codigo_motor.ilike.%${termo}%`,
    `numero_serie.ilike.%${termo}%`,
    `veiculo_modelo.ilike.%${termo}%`,
  ];
  if (placa) c.push(`veiculo_placa.ilike.%${placa}%`);
  return c;
}

export async function listarMotores(
  empresaId: string,
  filtro: FiltroMotores,
): Promise<{ itens: MotorLinha[]; total: number }> {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("motores")
    .select("*, cliente:clientes(id, nome)", { count: "exact" })
    .eq("empresa_id", empresaId);
  const condicoes = condicoesBusca(filtro.q);
  if (condicoes.length) q = q.or(condicoes.join(","));
  const de = (filtro.pagina - 1) * POR_PAGINA_MOTORES;
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(de, de + POR_PAGINA_MOTORES - 1);
  if (error) throw new Error(`Erro ao listar motores: ${error.message}`);
  return { itens: (data ?? []) as unknown as MotorLinha[], total: count ?? 0 };
}

export async function obterMotor(empresaId: string, id: string): Promise<MotorLinha | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("motores")
    .select("*, cliente:clientes(id, nome)")
    .eq("empresa_id", empresaId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar o motor: ${error.message}`);
  return data as unknown as MotorLinha | null;
}

/** Motores de um cliente (todos, mais recentes primeiro). */
export async function listarMotoresDoCliente(
  empresaId: string,
  clienteId: string,
): Promise<MotorCompleto[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("motores")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Erro ao listar motores do cliente: ${error.message}`);
  return data ?? [];
}

/** Busca para seletores: motores do cliente primeiro, depois os demais que casam com o termo. */
export async function buscarMotores(
  empresaId: string,
  termo: string,
  clienteId?: string | null,
  limite = 10,
): Promise<MotorResumo[]> {
  const supabase = await criarClienteServidor();
  const condicoes = condicoesBusca(termo);
  let q = supabase.from("motores").select(SELECT_RESUMO).eq("empresa_id", empresaId);
  if (condicoes.length) q = q.or(condicoes.join(","));
  else if (clienteId) q = q.eq("cliente_id", clienteId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limite * 3);
  if (error) throw new Error(`Erro ao buscar motores: ${error.message}`);
  const lista = data ?? [];
  if (clienteId)
    lista.sort((a, b) => Number(b.cliente_id === clienteId) - Number(a.cliente_id === clienteId));
  return lista.slice(0, limite);
}

export type HistoricoMotor = {
  /** Motores considerados "o mesmo": mesma placa ou mesmo código + nº de série. */
  motores: MotorLinha[];
  os: (OsHistorico & { cliente: { id: string; nome: string } | null })[];
};

/**
 * Todas as OS do motor e de qualquer registro equivalente (mesma placa, ou mesmo
 * código + nº de série), inclusive as vindas de clientes/lojistas diferentes (garantia).
 */
export async function historicoDoMotor(
  empresaId: string,
  motor: MotorCompleto,
  vePrecos: boolean,
): Promise<HistoricoMotor> {
  const supabase = await criarClienteServidor();
  const ids = new Set<string>([motor.id]);

  const equivalentes: string[] = [];
  if (motor.veiculo_placa)
    equivalentes.push(`veiculo_placa.eq.${termoSeguro(motor.veiculo_placa)}`);
  if (motor.codigo_motor && motor.numero_serie) {
    equivalentes.push(
      `and(codigo_motor.eq.${termoSeguro(motor.codigo_motor)},numero_serie.eq.${termoSeguro(motor.numero_serie)})`,
    );
  }
  if (equivalentes.length) {
    const { data, error } = await supabase
      .from("motores")
      .select("id")
      .eq("empresa_id", empresaId)
      .or(equivalentes.join(","))
      .limit(200);
    if (error) throw new Error(`Erro ao buscar motores equivalentes: ${error.message}`);
    for (const m of data ?? []) ids.add(m.id);
  }

  const filtroOs = [`motor_id.in.(${[...ids].join(",")})`];
  if (motor.veiculo_placa)
    filtroOs.push(`cliente_final_placa.eq.${termoSeguro(motor.veiculo_placa)}`);

  const [osRes, motoresRes] = await Promise.all([
    supabase
      .from("os")
      .select(`${SELECT_OS_HISTORICO}, cliente:clientes(id, nome)`)
      .eq("empresa_id", empresaId)
      .neq("status", "em_recebimento")
      .or(filtroOs.join(","))
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("motores")
      .select("*, cliente:clientes(id, nome)")
      .eq("empresa_id", empresaId)
      .in("id", [...ids]),
  ]);
  if (osRes.error) throw new Error(`Erro ao carregar o histórico do motor: ${osRes.error.message}`);
  if (motoresRes.error) throw new Error(`Erro ao carregar motores: ${motoresRes.error.message}`);

  type Bruta = Parameters<typeof enriquecerOs>[1][number] & {
    cliente: { id: string; nome: string } | null;
  };
  const brutas = (osRes.data ?? []) as unknown as Bruta[];
  const enriquecidas = await enriquecerOs(empresaId, brutas, vePrecos);
  const porId = new Map(brutas.map((b) => [b.id, b.cliente]));
  return {
    motores: (motoresRes.data ?? []) as unknown as MotorLinha[],
    os: enriquecidas.map((o) => ({ ...o, cliente: porId.get(o.id) ?? null })),
  };
}
