import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { OsStatus } from "@/lib/auth/permissoes";
import {
  STATUS_ABERTOS,
  aprovadosNoMes,
  contarPorStatus,
  dataLocal,
  entreguesNoMes,
  orcamentosParados,
  osAtrasadas,
  percentualLojista,
  rankingLojistas,
  serieSemanal,
  somar,
  ticketMedio,
  filaRecebimento,
  type AprovadoLinha,
  type OsLinha,
} from "@/lib/inicio/agregacoes";
import { hojeSaoPaulo } from "@/lib/os/quadro";

const SELECT_OS =
  "id, numero, status, cliente_id, tecnico_id, prazo_prometido, created_at, entregue_em, clientes(nome, tipo)";

type LinhaBruta = {
  id: string;
  numero: string;
  status: OsStatus;
  cliente_id: string;
  tecnico_id: string | null;
  prazo_prometido: string | null;
  created_at: string;
  entregue_em: string | null;
  clientes: { nome: string; tipo: "lojista" | "final" } | null;
};

function paraOsLinha(r: LinhaBruta): OsLinha {
  return {
    id: r.id,
    numero: r.numero,
    status: r.status,
    clienteId: r.cliente_id,
    clienteNome: r.clientes?.nome ?? null,
    clienteTipo: r.clientes?.tipo ?? null,
    tecnicoId: r.tecnico_id,
    prazo: r.prazo_prometido,
    criadoEm: r.created_at,
    entregueEm: r.entregue_em,
  };
}

/** Instante ISO de `dias` dias atrás (margem para o fuso). */
function iso(diasAtras: number): string {
  return new Date(Date.now() - diasAtras * 86_400_000).toISOString();
}

/** OS abertas + as criadas/entregues nas últimas `dias` dias (sem canceladas). */
async function carregarOs(empresaId: string, dias: number): Promise<OsLinha[]> {
  const supabase = await criarClienteServidor();
  const corte = iso(dias);
  const { data, error } = await supabase
    .from("os")
    .select(SELECT_OS)
    .eq("empresa_id", empresaId)
    .neq("status", "cancelado")
    .or(`status.in.(${STATUS_ABERTOS.join(",")}),created_at.gte.${corte},entregue_em.gte.${corte}`)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`Erro ao carregar OS do início: ${error.message}`);
  return (data as unknown as LinhaBruta[]).map(paraOsLinha);
}

/** Orçamentos aprovados desde `dias` dias atrás (só para quem vê preço — a RLS barra o técnico). */
async function carregarAprovados(empresaId: string, dias: number): Promise<AprovadoLinha[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("os_id, total, respondido_em, os!orcamentos_os_id_empresa_id_fkey(cliente_id, clientes(nome, tipo))")
    .eq("empresa_id", empresaId)
    .eq("status", "aprovado")
    .gte("respondido_em", iso(dias))
    .limit(2000);
  if (error) throw new Error(`Erro ao carregar orçamentos aprovados: ${error.message}`);
  type Bruto = {
    os_id: string;
    total: number;
    respondido_em: string | null;
    os: { cliente_id: string; clientes: { nome: string; tipo: "lojista" | "final" } | null } | null;
  };
  return (data as unknown as Bruto[])
    .filter((o) => o.respondido_em && o.os)
    .map((o) => ({
      osId: o.os_id,
      total: Number(o.total),
      respondidoEm: o.respondido_em!,
      clienteId: o.os!.cliente_id,
      clienteNome: o.os!.clientes?.nome ?? null,
      clienteTipo: o.os!.clientes?.tipo ?? null,
    }));
}

async function carregarEnvios(empresaId: string, osIds: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  if (osIds.length === 0) return m;
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("os_id, enviado_em")
    .eq("empresa_id", empresaId)
    .eq("status", "enviado")
    .in("os_id", osIds);
  if (error) throw new Error(`Erro ao carregar orçamentos enviados: ${error.message}`);
  for (const o of data) if (o.enviado_em) m.set(o.os_id, o.enviado_em);
  return m;
}

export const DIAS_ORCAMENTO_PARADO = 3;

export type InicioBalcao = {
  recebimento: OsLinha[];
  orcamentosParados: (OsLinha & { diasParado: number })[];
  prontas: OsLinha[];
  diasLimite: number;
};

export async function carregarInicioBalcao(empresaId: string): Promise<InicioBalcao> {
  const hoje = hojeSaoPaulo();
  const os = await carregarOs(empresaId, 3);
  const enviadas = os.filter((o) => o.status === "orcamento_enviado").map((o) => o.id);
  const envios = await carregarEnvios(empresaId, enviadas);
  return {
    recebimento: filaRecebimento(os, hoje),
    orcamentosParados: orcamentosParados(os, envios, hoje, DIAS_ORCAMENTO_PARADO),
    prontas: os.filter((o) => o.status === "pronto"),
    diasLimite: DIAS_ORCAMENTO_PARADO,
  };
}

export type InicioTecnico = { minhas: OsLinha[]; atrasadas: OsLinha[]; hoje: string };

export async function carregarInicioTecnico(
  empresaId: string,
  membroId: string,
): Promise<InicioTecnico> {
  const hoje = hojeSaoPaulo();
  const os = (await carregarOs(empresaId, 1)).filter(
    (o) => o.tecnicoId === membroId && o.status !== "entregue",
  );
  return { minhas: os, atrasadas: osAtrasadas(os, hoje), hoje };
}

export type InicioFinanceiro = {
  entreguesNoMes: number;
  valorAprovadoNoMes: number | null;
  aprovadosNoMes: number | null;
};

export async function carregarInicioFinanceiro(
  empresaId: string,
  vePrecos: boolean,
): Promise<InicioFinanceiro> {
  const hoje = hojeSaoPaulo();
  const [os, aprovados] = await Promise.all([
    carregarOs(empresaId, 35),
    vePrecos ? carregarAprovados(empresaId, 35) : Promise.resolve([]),
  ]);
  const doMes = aprovadosNoMes(aprovados, hoje);
  return {
    entreguesNoMes: entreguesNoMes(os, hoje).length,
    valorAprovadoNoMes: vePrecos ? somar(doMes.map((a) => a.total)) : null,
    aprovadosNoMes: vePrecos ? doMes.length : null,
  };
}

export type InicioDono = {
  porStatus: Partial<Record<OsStatus, number>>;
  atrasadas: number;
  entreguesNoMes: number;
  valorAprovadoNoMes: number;
  ticketMedio: number | null;
  percentual: { lojista: number; final: number } | null;
  semanas: ReturnType<typeof serieSemanal>;
  ranking: ReturnType<typeof rankingLojistas>;
};

export async function carregarInicioDono(empresaId: string): Promise<InicioDono> {
  const hoje = hojeSaoPaulo();
  // 8 semanas = 56 dias + folga até a segunda-feira mais antiga
  const [os, aprovados] = await Promise.all([
    carregarOs(empresaId, 63),
    carregarAprovados(empresaId, 35),
  ]);
  const doMes = aprovadosNoMes(aprovados, hoje);
  const mes = hoje.slice(0, 7);
  const criadasNoMes = os.filter((o) => dataLocal(o.criadoEm).startsWith(mes));
  return {
    porStatus: contarPorStatus(os),
    atrasadas: osAtrasadas(os, hoje).length,
    entreguesNoMes: entreguesNoMes(os, hoje).length,
    valorAprovadoNoMes: somar(doMes.map((a) => a.total)),
    ticketMedio: ticketMedio(doMes),
    percentual: percentualLojista(criadasNoMes),
    semanas: serieSemanal(os, hoje, 8),
    ranking: rankingLojistas(doMes, 5),
  };
}
