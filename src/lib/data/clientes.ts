import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { OsStatus } from "@/lib/auth/permissoes";
import { normalizarPlaca } from "@/lib/validacoes/motores";
import { somenteDigitos, type FiltroClientes, type TipoCliente } from "@/lib/validacoes/clientes";
import type { Database } from "@/lib/supabase/types";

/**
 * Leitura do módulo Clientes (server-only). Usa a sessão do usuário: a RLS filtra
 * por empresa e papel. Preço só é consultado quando `vePrecos` é true.
 */

export const POR_PAGINA_CLIENTES = 20;
export const POR_PAGINA_HISTORICO = 15;

export type ClienteLinha = {
  id: string;
  tipo: TipoCliente;
  nome: string;
  nome_fantasia: string | null;
  documento: string | null;
  telefone_whatsapp: string | null;
  ativo: boolean;
  os_em_andamento: number;
};

/** Remove caracteres que quebram a sintaxe de filtros `.or()` do PostgREST. */
export function termoSeguro(termo: string): string {
  return termo
    .replace(/[,()%*\\"':;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STATUS_ANDAMENTO: OsStatus[] = [
  "recebido",
  "em_analise",
  "orcamento_enviado",
  "aprovado",
  "em_execucao",
  "aguardando_peca",
  "pronto",
];

export async function listarClientes(
  empresaId: string,
  filtro: FiltroClientes,
): Promise<{ itens: ClienteLinha[]; total: number }> {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("clientes")
    .select("id, tipo, nome, nome_fantasia, documento, telefone_whatsapp, ativo", {
      count: "exact",
    })
    .eq("empresa_id", empresaId);

  if (filtro.tipo !== "todos") q = q.eq("tipo", filtro.tipo);
  if (filtro.situacao === "ativos") q = q.eq("ativo", true);
  if (filtro.situacao === "inativos") q = q.eq("ativo", false);

  const termo = termoSeguro(filtro.q);
  if (termo) {
    const condicoes = [`nome.ilike.%${termo}%`, `nome_fantasia.ilike.%${termo}%`];
    const digitos = somenteDigitos(termo);
    if (digitos.length >= 3) {
      condicoes.push(`documento.ilike.%${digitos}%`, `telefone_whatsapp.ilike.%${digitos}%`);
    }
    const placa = normalizarPlaca(termo);
    if (placa.length >= 3) {
      const [motores, os] = await Promise.all([
        supabase
          .from("motores")
          .select("cliente_id")
          .eq("empresa_id", empresaId)
          .not("cliente_id", "is", null)
          .ilike("veiculo_placa", `%${placa}%`)
          .limit(200),
        supabase
          .from("os")
          .select("cliente_id")
          .eq("empresa_id", empresaId)
          .ilike("cliente_final_placa", `%${placa}%`)
          .limit(200),
      ]);
      const ids = new Set<string>();
      for (const m of motores.data ?? []) if (m.cliente_id) ids.add(m.cliente_id);
      for (const o of os.data ?? []) ids.add(o.cliente_id);
      if (ids.size) condicoes.push(`id.in.(${[...ids].join(",")})`);
    }
    q = q.or(condicoes.join(","));
  }

  const de = (filtro.pagina - 1) * POR_PAGINA_CLIENTES;
  const { data, error, count } = await q.order("nome").range(de, de + POR_PAGINA_CLIENTES - 1);
  if (error) throw new Error(`Erro ao listar clientes: ${error.message}`);

  const ids = (data ?? []).map((c) => c.id);
  const andamento = new Map<string, number>();
  if (ids.length) {
    const { data: os, error: erroOs } = await supabase
      .from("os")
      .select("cliente_id")
      .eq("empresa_id", empresaId)
      .in("cliente_id", ids)
      .in("status", STATUS_ANDAMENTO);
    if (erroOs) throw new Error(`Erro ao contar OS dos clientes: ${erroOs.message}`);
    for (const o of os ?? []) andamento.set(o.cliente_id, (andamento.get(o.cliente_id) ?? 0) + 1);
  }

  return {
    itens: (data ?? []).map((c) => ({ ...c, os_em_andamento: andamento.get(c.id) ?? 0 })),
    total: count ?? 0,
  };
}

export type ClienteCompleto = Database["public"]["Tables"]["clientes"]["Row"];

export async function obterCliente(empresaId: string, id: string): Promise<ClienteCompleto | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar o cliente: ${error.message}`);
  return data;
}

export type TabelaPrecoOpcao = { id: string; nome: string; padrao_para: TipoCliente | null };

/** Tabelas de preço ativas para o select (vazio se o usuário não lê preços). */
export async function listarTabelasPreco(empresaId: string): Promise<TabelaPrecoOpcao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("tabelas_preco")
    .select("id, nome, padrao_para")
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(`Erro ao listar tabelas de preço: ${error.message}`);
  return data ?? [];
}

export type ClienteResumoBusca = {
  id: string;
  nome: string;
  tipo: TipoCliente;
  documento: string | null;
  telefone_whatsapp: string | null;
};

/** Busca rápida para seletores (nome, fantasia, documento, telefone). */
export async function buscarClientes(
  empresaId: string,
  termo: string,
  limite = 8,
): Promise<ClienteResumoBusca[]> {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("clientes")
    .select("id, nome, tipo, documento, telefone_whatsapp")
    .eq("empresa_id", empresaId)
    .eq("ativo", true);
  const t = termoSeguro(termo);
  if (t) {
    const condicoes = [`nome.ilike.%${t}%`, `nome_fantasia.ilike.%${t}%`];
    const d = somenteDigitos(t);
    if (d.length >= 3) condicoes.push(`documento.ilike.%${d}%`, `telefone_whatsapp.ilike.%${d}%`);
    q = q.or(condicoes.join(","));
  }
  const { data, error } = await q.order("nome").limit(limite);
  if (error) throw new Error(`Erro ao buscar clientes: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Ficha: resumo e histórico de OS
// ---------------------------------------------------------------------------

export type ResumoCliente = {
  os_em_andamento: number;
  os_12_meses: number;
  /** null quando o usuário não pode ver preços. */
  em_aberto: number | null;
  motores_em_garantia: number;
};

const STATUS_EM_ABERTO: OsStatus[] = ["aprovado", "em_execucao", "aguardando_peca", "pronto"];

export async function resumoCliente(
  empresaId: string,
  clienteId: string,
  vePrecos: boolean,
): Promise<ResumoCliente> {
  const supabase = await criarClienteServidor();
  const hoje = new Date();
  const umAnoAtras = new Date(hoje);
  umAnoAtras.setFullYear(hoje.getFullYear() - 1);
  const hojeIso = new Date(hoje.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("os")
    .select("status, created_at, motor_id, garantia_ate, orcamento_aprovado_id")
    .eq("empresa_id", empresaId)
    .eq("cliente_id", clienteId)
    .neq("status", "em_recebimento");
  if (error) throw new Error(`Erro ao resumir o cliente: ${error.message}`);
  const os = data ?? [];

  let emAberto: number | null = null;
  if (vePrecos) {
    const ids = os
      .filter((o) => STATUS_EM_ABERTO.includes(o.status) && o.orcamento_aprovado_id)
      .map((o) => o.orcamento_aprovado_id as string);
    emAberto = 0;
    if (ids.length) {
      const { data: orc, error: erroOrc } = await supabase
        .from("orcamentos")
        .select("total")
        .eq("empresa_id", empresaId)
        .in("id", ids);
      if (erroOrc) throw new Error(`Erro ao somar orçamentos: ${erroOrc.message}`);
      emAberto = (orc ?? []).reduce((s, o) => s + Number(o.total), 0);
    }
  }

  const garantia = new Set<string>();
  for (const o of os) {
    if (o.status === "entregue" && o.garantia_ate && o.garantia_ate >= hojeIso) {
      garantia.add(o.motor_id ?? `os-${o.created_at}`);
    }
  }

  return {
    os_em_andamento: os.filter((o) => STATUS_ANDAMENTO.includes(o.status)).length,
    os_12_meses: os.filter((o) => new Date(o.created_at) >= umAnoAtras).length,
    em_aberto: emAberto,
    motores_em_garantia: garantia.size,
  };
}

export type OsHistorico = {
  id: string;
  numero: string;
  created_at: string;
  status: OsStatus;
  eh_garantia: boolean;
  garantia_ate: string | null;
  motor: {
    id: string;
    marca: string | null;
    modelo: string | null;
    codigo_motor: string | null;
  } | null;
  placa: string | null;
  cliente_final_nome: string | null;
  servicos: string[];
  /** null quando o usuário não pode ver preços ou não há orçamento aprovado. */
  valor: number | null;
};

export type FiltroHistorico = { q: string; status: OsStatus | "todos"; pagina: number };

type LinhaOs = {
  id: string;
  numero: string;
  created_at: string;
  status: OsStatus;
  eh_garantia: boolean | null;
  garantia_ate: string | null;
  motor_id: string | null;
  cliente_id: string;
  cliente_final_nome: string | null;
  cliente_final_placa: string | null;
  orcamento_aprovado_id: string | null;
  motores: {
    id: string;
    marca: string | null;
    modelo: string | null;
    codigo_motor: string | null;
    veiculo_placa: string | null;
  } | null;
};

export const SELECT_OS_HISTORICO =
  "id, numero, created_at, status, eh_garantia, garantia_ate, motor_id, cliente_id, cliente_final_nome, cliente_final_placa, orcamento_aprovado_id, motores(id, marca, modelo, codigo_motor, veiculo_placa)";

/** Completa linhas de OS com serviços principais e valor (se puder ver preço). */
export async function enriquecerOs(
  empresaId: string,
  linhas: LinhaOs[],
  vePrecos: boolean,
): Promise<OsHistorico[]> {
  const supabase = await criarClienteServidor();
  const orcIds = linhas.map((o) => o.orcamento_aprovado_id).filter((v): v is string => !!v);
  const osIds = linhas.map((o) => o.id);

  const servicos = new Map<string, string[]>();
  if (osIds.length) {
    // View sem colunas de preço: vale para qualquer papel.
    const { data } = await supabase
      .from("v_orcamento_itens_sem_preco")
      .select("os_id, descricao, tipo, orcamento_status, versao")
      .eq("empresa_id", empresaId)
      .in("os_id", osIds)
      .eq("tipo", "servico")
      .in("orcamento_status", ["aprovado", "enviado", "rascunho"])
      .order("versao", { ascending: false })
      .order("ordem");
    for (const i of data ?? []) {
      const lista = servicos.get(i.os_id) ?? [];
      if (!lista.includes(i.descricao) && lista.length < 3) lista.push(i.descricao);
      servicos.set(i.os_id, lista);
    }
  }

  const valores = new Map<string, number>();
  if (vePrecos && orcIds.length) {
    const { data } = await supabase
      .from("orcamentos")
      .select("id, total")
      .eq("empresa_id", empresaId)
      .in("id", orcIds);
    for (const o of data ?? []) valores.set(o.id, Number(o.total));
  }

  return linhas.map((o) => ({
    id: o.id,
    numero: o.numero,
    created_at: o.created_at,
    status: o.status,
    eh_garantia: o.eh_garantia ?? false,
    garantia_ate: o.garantia_ate,
    motor: o.motores
      ? {
          id: o.motores.id,
          marca: o.motores.marca,
          modelo: o.motores.modelo,
          codigo_motor: o.motores.codigo_motor,
        }
      : null,
    placa: o.motores?.veiculo_placa ?? o.cliente_final_placa,
    cliente_final_nome: o.cliente_final_nome,
    servicos: servicos.get(o.id) ?? [],
    valor: o.orcamento_aprovado_id ? (valores.get(o.orcamento_aprovado_id) ?? null) : null,
  }));
}

export async function historicoOsCliente(
  empresaId: string,
  clienteId: string,
  filtro: FiltroHistorico,
  vePrecos: boolean,
): Promise<{ itens: OsHistorico[]; total: number }> {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("os")
    .select(SELECT_OS_HISTORICO, { count: "exact" })
    .eq("empresa_id", empresaId)
    .eq("cliente_id", clienteId)
    .neq("status", "em_recebimento");
  if (filtro.status !== "todos") q = q.eq("status", filtro.status);

  const termo = termoSeguro(filtro.q);
  if (termo) {
    const condicoes = [
      `numero.ilike.%${termo}%`,
      `cliente_final_placa.ilike.%${normalizarPlaca(termo) || termo}%`,
    ];
    const { data: motores } = await supabase
      .from("motores")
      .select("id")
      .eq("empresa_id", empresaId)
      .or(
        [
          `marca.ilike.%${termo}%`,
          `modelo.ilike.%${termo}%`,
          `codigo_motor.ilike.%${termo}%`,
          `numero_serie.ilike.%${termo}%`,
          `veiculo_placa.ilike.%${normalizarPlaca(termo) || termo}%`,
        ].join(","),
      )
      .limit(200);
    const ids = (motores ?? []).map((m) => m.id);
    if (ids.length) condicoes.push(`motor_id.in.(${ids.join(",")})`);
    q = q.or(condicoes.join(","));
  }

  const de = (filtro.pagina - 1) * POR_PAGINA_HISTORICO;
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(de, de + POR_PAGINA_HISTORICO - 1);
  if (error) throw new Error(`Erro ao carregar o histórico de OS: ${error.message}`);
  const itens = await enriquecerOs(empresaId, (data ?? []) as unknown as LinhaOs[], vePrecos);
  return { itens, total: count ?? 0 };
}
