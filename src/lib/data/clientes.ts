import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { OsStatus } from "@/lib/auth/permissoes";
import { normalizarPlaca } from "@/lib/validacoes/motores";
import type { FiltroClientes, TipoCliente } from "@/lib/validacoes/clientes";
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

/**
 * Lista paginada com busca sem acento (RPC `listar_clientes`: nome, fantasia,
 * documento, telefone, placa de motores e de OS). Mais relevantes primeiro.
 */
export async function listarClientes(
  empresaId: string,
  filtro: FiltroClientes,
): Promise<{ itens: ClienteLinha[]; total: number }> {
  const supabase = await criarClienteServidor();
  const termo = filtro.q.trim();
  const { data, error } = await supabase.rpc("listar_clientes", {
    p_empresa_id: empresaId,
    p_termo: termo || undefined,
    p_tipo: filtro.tipo === "todos" ? undefined : filtro.tipo,
    p_ativo: filtro.situacao === "todos" ? undefined : filtro.situacao === "ativos",
    p_limite: POR_PAGINA_CLIENTES,
    p_offset: (filtro.pagina - 1) * POR_PAGINA_CLIENTES,
  });
  if (error) throw new Error(`Erro ao listar clientes: ${error.message}`);
  const linhas = data ?? [];
  return {
    itens: linhas.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      nome: c.nome,
      nome_fantasia: c.nome_fantasia ?? null,
      documento: c.documento ?? null,
      telefone_whatsapp: c.telefone_whatsapp ?? null,
      ativo: c.ativo,
      os_em_andamento: c.os_em_andamento ?? 0,
    })),
    total: linhas.length ? Number(linhas[0].total) : 0,
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

/** Busca rápida para seletores (clientes ativos; mesma busca sem acento da lista). */
export async function buscarClientes(
  empresaId: string,
  termo: string,
  limite = 8,
): Promise<ClienteResumoBusca[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("listar_clientes", {
    p_empresa_id: empresaId,
    p_termo: termo.trim() || undefined,
    p_ativo: true,
    p_limite: limite,
  });
  if (error) throw new Error(`Erro ao buscar clientes: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    documento: c.documento ?? null,
    telefone_whatsapp: c.telefone_whatsapp ?? null,
  }));
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

/** Números da ficha (RPC `resumo_cliente`; `em_aberto` só para quem vê preço). */
export async function resumoCliente(
  empresaId: string,
  clienteId: string,
  vePrecos: boolean,
): Promise<ResumoCliente> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("resumo_cliente", { p_cliente_id: clienteId });
  if (error) throw new Error(`Erro ao resumir o cliente: ${error.message}`);
  const r = data?.[0];
  const emAberto = r?.em_aberto ?? null;
  return {
    os_em_andamento: r?.os_em_andamento ?? 0,
    os_12_meses: r?.os_12_meses ?? 0,
    em_aberto: vePrecos ? Number(emAberto ?? 0) : null,
    motores_em_garantia: r?.motores_em_garantia ?? 0,
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
