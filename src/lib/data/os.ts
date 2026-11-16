import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BUCKET_ANEXOS } from "@/lib/recebimento/armazenamento";
import { MARCA_CONCLUIDO } from "@/lib/os/cronometro";
import { descricaoMotor } from "@/lib/validacoes/motores";
import type { OsStatus } from "@/lib/auth/permissoes";
import type { CartaoOs } from "@/lib/os/quadro";
import type { Database } from "@/lib/supabase/types";

/** Dados do quadro e do detalhe da OS. Server-only; a RLS filtra por empresa/papel. */

type Anexo = Database["public"]["Enums"]["anexo_etapa"];

export type Tecnico = { id: string; nome: string; papel: "dono" | "tecnico" | "balcao" | "financeiro" };

export async function listarResponsaveis(empresaId: string): Promise<Tecnico[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("membros")
    .select("id, nome, papel")
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .in("papel", ["tecnico", "dono", "balcao"])
    .order("nome");
  if (error) throw new Error(`Erro ao listar técnicos: ${error.message}`);
  return data;
}

type LinhaQuadro = {
  id: string;
  numero: string;
  status: OsStatus;
  prazo_prometido: string | null;
  tecnico_id: string | null;
  cliente_final_placa: string | null;
  eh_garantia: boolean | null;
  updated_at: string;
  clientes: { nome: string; tipo: "lojista" | "final" } | null;
  motores: {
    marca: string | null;
    modelo: string | null;
    codigo_motor: string | null;
    veiculo_placa: string | null;
  } | null;
};

const SELECT_QUADRO =
  "id, numero, status, prazo_prometido, tecnico_id, cliente_final_placa, eh_garantia, updated_at, clientes(nome, tipo), motores(marca, modelo, codigo_motor, veiculo_placa)";

export function paraCartao(l: LinhaQuadro, tecnicos: Map<string, string>): CartaoOs {
  return {
    id: l.id,
    numero: l.numero,
    status: l.status,
    clienteNome: l.clientes?.nome ?? "—",
    clienteTipo: l.clientes?.tipo ?? "final",
    motor: l.motores ? descricaoMotor(l.motores) : "Sem motor",
    placa: l.cliente_final_placa ?? l.motores?.veiculo_placa ?? null,
    tecnicoId: l.tecnico_id,
    tecnicoNome: l.tecnico_id ? (tecnicos.get(l.tecnico_id) ?? null) : null,
    prazo: l.prazo_prometido,
    atualizadoEm: l.updated_at,
    ehGarantia: l.eh_garantia ?? false,
  };
}

export async function listarCartoesQuadro(
  empresaId: string,
  opcoes: { encerradas?: boolean } = {},
): Promise<CartaoOs[]> {
  const supabase = await criarClienteServidor();
  const status: OsStatus[] = opcoes.encerradas
    ? ["entregue", "reprovado", "cancelado"]
    : [
        "em_recebimento",
        "recebido",
        "em_analise",
        "orcamento_enviado",
        "aprovado",
        "em_execucao",
        "aguardando_peca",
        "pronto",
      ];
  let q = supabase
    .from("os")
    .select(SELECT_QUADRO)
    .eq("empresa_id", empresaId)
    .in("status", status);
  q = opcoes.encerradas
    ? q.order("updated_at", { ascending: false }).limit(200)
    : q.order("created_at", { ascending: false }).limit(500);
  const [{ data, error }, resp] = await Promise.all([q, listarResponsaveis(empresaId)]);
  if (error) throw new Error(`Erro ao listar OS: ${error.message}`);
  const nomes = new Map(resp.map((t) => [t.id, t.nome]));
  return (data as unknown as LinhaQuadro[]).map((l) => paraCartao(l, nomes));
}

export type OsDetalhe = {
  id: string;
  numero: string;
  status: OsStatus;
  prazo_prometido: string | null;
  observacoes: string | null;
  tecnico_id: string | null;
  tecnico_nome: string | null;
  eh_garantia: boolean;
  os_origem_id: string | null;
  garantia_dias: number | null;
  garantia_ate: string | null;
  entregue_em: string | null;
  created_at: string;
  checklist_concluido_em: string | null;
  motivo_cancelamento: string | null;
  orcamento_aprovado_id: string | null;
  cliente_final_nome: string | null;
  cliente_final_placa: string | null;
  cliente: { id: string; nome: string; tipo: "lojista" | "final" } | null;
  motor: { id: string; descricao: string; placa: string | null } | null;
};

export async function obterOsDetalhe(empresaId: string, osId: string): Promise<OsDetalhe | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os")
    .select(
      "id, numero, status, prazo_prometido, observacoes, tecnico_id, eh_garantia, os_origem_id, garantia_dias, garantia_ate, entregue_em, created_at, checklist_concluido_em, motivo_cancelamento, orcamento_aprovado_id, cliente_final_nome, cliente_final_placa, clientes(id, nome, tipo), motores(id, marca, modelo, codigo_motor, veiculo_placa)",
    )
    .eq("empresa_id", empresaId)
    .eq("id", osId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar a OS: ${error.message}`);
  if (!data) return null;
  let tecnicoNome: string | null = null;
  if (data.tecnico_id) {
    const { data: m } = await supabase
      .from("membros")
      .select("nome")
      .eq("empresa_id", empresaId)
      .eq("id", data.tecnico_id)
      .maybeSingle();
    tecnicoNome = m?.nome ?? null;
  }
  const c = data.clientes as unknown as OsDetalhe["cliente"];
  const m = data.motores as unknown as {
    id: string;
    marca: string | null;
    modelo: string | null;
    codigo_motor: string | null;
    veiculo_placa: string | null;
  } | null;
  return {
    id: data.id,
    numero: data.numero,
    status: data.status,
    prazo_prometido: data.prazo_prometido,
    observacoes: data.observacoes,
    tecnico_id: data.tecnico_id,
    tecnico_nome: tecnicoNome,
    eh_garantia: data.eh_garantia ?? false,
    os_origem_id: data.os_origem_id,
    garantia_dias: data.garantia_dias,
    garantia_ate: data.garantia_ate,
    entregue_em: data.entregue_em,
    created_at: data.created_at,
    checklist_concluido_em: data.checklist_concluido_em,
    motivo_cancelamento: data.motivo_cancelamento,
    orcamento_aprovado_id: data.orcamento_aprovado_id,
    cliente_final_nome: data.cliente_final_nome,
    cliente_final_placa: data.cliente_final_placa,
    cliente: c,
    motor: m ? { id: m.id, descricao: descricaoMotor(m), placa: m.veiculo_placa } : null,
  };
}

export type EventoHistorico = {
  id: string;
  de: OsStatus | null;
  para: OsStatus;
  quando: string;
  quem: string | null;
  motivo: string | null;
};

export async function listarHistoricoOs(empresaId: string, osId: string): Promise<EventoHistorico[]> {
  const supabase = await criarClienteServidor();
  const [{ data, error }, resp] = await Promise.all([
    supabase
      .from("os_status_historico")
      .select("id, status_de, status_para, membro_id, motivo, created_at")
      .eq("empresa_id", empresaId)
      .eq("os_id", osId)
      .order("created_at", { ascending: false }),
    supabase.from("membros").select("id, nome").eq("empresa_id", empresaId),
  ]);
  if (error) throw new Error(`Erro ao carregar histórico: ${error.message}`);
  const nomes = new Map((resp.data ?? []).map((m) => [m.id, m.nome]));
  return data.map((h) => ({
    id: h.id,
    de: h.status_de,
    para: h.status_para,
    quando: h.created_at,
    quem: h.membro_id ? (nomes.get(h.membro_id) ?? null) : null,
    motivo: h.motivo,
  }));
}

export type AnexoView = { id: string; etapa: Anexo; legenda: string | null; url: string | null; quando: string };

export async function listarAnexosOs(empresaId: string, osId: string): Promise<AnexoView[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_anexos")
    .select("id, etapa, legenda, storage_path, created_at")
    .eq("empresa_id", empresaId)
    .eq("os_id", osId)
    .order("created_at");
  if (error) throw new Error(`Erro ao carregar anexos: ${error.message}`);
  const urls = new Map<string, string>();
  if (data.length) {
    const { data: ass } = await supabase.storage
      .from(BUCKET_ANEXOS)
      .createSignedUrls(
        data.map((a) => a.storage_path),
        3600,
      );
    for (const a of ass ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
  }
  return data.map((a) => ({
    id: a.id,
    etapa: a.etapa,
    legenda: a.legenda,
    url: urls.get(a.storage_path) ?? null,
    quando: a.created_at,
  }));
}

export type DivergenciaView = { grupo: string; descricao: string; status: string; quantidade: number | null; observacao: string | null };

export async function listarDivergenciasChecklist(
  empresaId: string,
  osId: string,
): Promise<{ total: number; divergencias: DivergenciaView[] }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_checklist_itens")
    .select("grupo, descricao, status, quantidade, observacao, ordem")
    .eq("empresa_id", empresaId)
    .eq("os_id", osId)
    .order("ordem");
  if (error) throw new Error(`Erro ao carregar checklist: ${error.message}`);
  return {
    total: data.length,
    divergencias: data.filter((i) => i.status !== "ok" && i.status !== "na"),
  };
}

export type ResumoOrcamentoOs = { versao: number; status: string; total: number | null }[];

/** Resumo simples do orçamento (total só quando pode ver preço). */
export async function resumirOrcamentosOs(
  empresaId: string,
  osId: string,
  vePrecos: boolean,
): Promise<ResumoOrcamentoOs> {
  const supabase = await criarClienteServidor();
  if (!vePrecos) return [];
  const { data, error } = await supabase
    .from("orcamentos")
    .select("versao, status, total")
    .eq("empresa_id", empresaId)
    .eq("os_id", osId)
    .order("versao", { ascending: false });
  if (error) throw new Error(`Erro ao carregar orçamento: ${error.message}`);
  return data.map((o) => ({ versao: o.versao, status: o.status, total: Number(o.total) }));
}

export type ItemExecucao = {
  id: string;
  descricao: string;
  quantidade: number;
  concluido: boolean;
  /** ms acumulados em apontamentos já encerrados deste item. */
};

export type ApontamentoView = {
  id: string;
  orcamento_item_id: string | null;
  membro_id: string;
  membro_nome: string | null;
  inicio: string;
  fim: string | null;
  minutos: number | null;
  observacao: string | null;
};

/** Serviços do orçamento aprovado (view sem preço) e apontamentos da OS. */
export async function obterExecucaoOs(
  empresaId: string,
  osId: string,
): Promise<{ itens: ItemExecucao[]; apontamentos: ApontamentoView[] }> {
  const supabase = await criarClienteServidor();
  const [itensRes, apRes, membrosRes] = await Promise.all([
    supabase
      .from("v_orcamento_itens_sem_preco")
      .select("id, descricao, quantidade, ordem")
      .eq("empresa_id", empresaId)
      .eq("os_id", osId)
      .eq("orcamento_status", "aprovado")
      .eq("tipo", "servico")
      .order("ordem"),
    supabase
      .from("apontamentos")
      .select("id, orcamento_item_id, membro_id, inicio, fim, minutos, observacao")
      .eq("empresa_id", empresaId)
      .eq("os_id", osId)
      .order("inicio"),
    supabase.from("membros").select("id, nome").eq("empresa_id", empresaId),
  ]);
  if (itensRes.error) throw new Error(`Erro ao carregar serviços: ${itensRes.error.message}`);
  if (apRes.error) throw new Error(`Erro ao carregar apontamentos: ${apRes.error.message}`);
  const nomes = new Map((membrosRes.data ?? []).map((m) => [m.id, m.nome]));
  const apontamentos: ApontamentoView[] = apRes.data.map((a) => ({
    ...a,
    membro_nome: nomes.get(a.membro_id) ?? null,
  }));
  const concluidos = new Set(
    apontamentos
      .filter((a) => a.observacao === MARCA_CONCLUIDO && a.orcamento_item_id)
      .map((a) => a.orcamento_item_id as string),
  );
  const itens = (itensRes.data ?? []).map((i) => ({
    id: i.id as string,
    descricao: i.descricao as string,
    quantidade: Number(i.quantidade),
    concluido: concluidos.has(i.id as string),
  }));
  return { itens, apontamentos };
}

export type GarantiaInfo = {
  entregaAssinatura: { nome: string; created_at: string } | null;
  garantiaOs: { id: string; numero: string }[];
};

export async function obterEntregaGarantia(empresaId: string, osId: string): Promise<GarantiaInfo> {
  const supabase = await criarClienteServidor();
  const [ass, gar] = await Promise.all([
    supabase
      .from("os_assinaturas")
      .select("nome, created_at")
      .eq("empresa_id", empresaId)
      .eq("os_id", osId)
      .eq("tipo", "entrega")
      .limit(1)
      .maybeSingle(),
    supabase.from("os").select("id, numero").eq("empresa_id", empresaId).eq("os_origem_id", osId),
  ]);
  return { entregaAssinatura: ass.data ?? null, garantiaOs: gar.data ?? [] };
}

export async function obterOsOrigem(
  empresaId: string,
  origemId: string,
): Promise<{ id: string; numero: string } | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("os")
    .select("id, numero")
    .eq("empresa_id", empresaId)
    .eq("id", origemId)
    .maybeSingle();
  return data;
}
