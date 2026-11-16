import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { FiltroMotores } from "@/lib/validacoes/motores";
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

type LinhaListarMotores = Database["public"]["Functions"]["listar_motores"]["Returns"][number];

/** Converte a linha da RPC (o gerador não marca colunas anuláveis) em MotorLinha. */
function paraMotorLinha(m: LinhaListarMotores): MotorLinha {
  return {
    id: m.id,
    empresa_id: m.empresa_id,
    cliente_id: m.cliente_id ?? null,
    marca: m.marca ?? null,
    modelo: m.modelo ?? null,
    codigo_motor: m.codigo_motor ?? null,
    numero_serie: m.numero_serie ?? null,
    combustivel: m.combustivel ?? null,
    cilindros: m.cilindros ?? null,
    cilindrada: m.cilindrada ?? null,
    valvulas_por_cilindro: m.valvulas_por_cilindro ?? null,
    veiculo_placa: m.veiculo_placa ?? null,
    veiculo_modelo: m.veiculo_modelo ?? null,
    veiculo_ano: m.veiculo_ano ?? null,
    observacoes: m.observacoes ?? null,
    created_at: m.created_at,
    updated_at: m.updated_at,
    cliente: m.cliente_id ? { id: m.cliente_id, nome: m.cliente_nome ?? "" } : null,
  };
}

/**
 * Lista paginada com busca sem acento (RPC `listar_motores`: marca, modelo,
 * código, nº de série, veículo, nome do cliente e trecho da placa).
 */
export async function listarMotores(
  empresaId: string,
  filtro: FiltroMotores,
): Promise<{ itens: MotorLinha[]; total: number }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("listar_motores", {
    p_empresa_id: empresaId,
    p_termo: filtro.q.trim() || undefined,
    p_limite: POR_PAGINA_MOTORES,
    p_offset: (filtro.pagina - 1) * POR_PAGINA_MOTORES,
  });
  if (error) throw new Error(`Erro ao listar motores: ${error.message}`);
  const linhas = data ?? [];
  return {
    itens: linhas.map(paraMotorLinha),
    total: linhas.length ? Number(linhas[0].total) : 0,
  };
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

/**
 * Busca para seletores: sem termo, os motores do cliente; com termo, todos os
 * que casam (sem acento), os do cliente primeiro.
 */
export async function buscarMotores(
  empresaId: string,
  termo: string,
  clienteId?: string | null,
  limite = 10,
): Promise<MotorResumo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("listar_motores", {
    p_empresa_id: empresaId,
    p_termo: termo.trim() || undefined,
    p_cliente_id: clienteId ?? undefined,
    p_limite: limite,
  });
  if (error) throw new Error(`Erro ao buscar motores: ${error.message}`);
  return (data ?? []).map((m) => {
    const l = paraMotorLinha(m);
    return {
      id: l.id,
      cliente_id: l.cliente_id,
      marca: l.marca,
      modelo: l.modelo,
      codigo_motor: l.codigo_motor,
      numero_serie: l.numero_serie,
      cilindros: l.cilindros,
      valvulas_por_cilindro: l.valvulas_por_cilindro,
      veiculo_placa: l.veiculo_placa,
      veiculo_modelo: l.veiculo_modelo,
      veiculo_ano: l.veiculo_ano,
    };
  });
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
