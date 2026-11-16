import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { chaveItem, precoEfetivo, totalKit, type UnidadeServico } from "./calculos";

/**
 * Busca unificada (serviços, peças e kits) para o seletor de itens do
 * orçamento. Roda com o cliente do navegador: a RLS decide o que cada papel
 * enxerga. Sem permissão de preço (técnico) usa as views sem coluna de preço
 * e devolve `precoSugerido: null`.
 */

export type ItemCatalogo = {
  tipo: "servico" | "peca" | "kit";
  id: string;
  codigo: string | null;
  descricao: string;
  /** Unidade de cobrança: "un", "cilindro", "valvula", "hora" (serviço), unidade da peça ou "kit". */
  unidade: string;
  /** Preço unitário sugerido (tabela escolhida, ou base); total estimado no caso do kit. null = sem permissão. */
  precoSugerido: number | null;
  /** Complemento para exibir: categoria, marca ou nº de itens do kit. */
  detalhe: string | null;
};

export type ParametrosBusca = {
  empresaId: string;
  termo: string;
  vePrecos: boolean;
  tabelaPrecoId?: string | null;
  tipos?: readonly ItemCatalogo["tipo"][];
  limitePorTipo?: number;
};

/** Remove caracteres que quebram o filtro `or()` do PostgREST e os curingas do LIKE. */
export function sanitizarTermo(termo: string): string {
  return termo.replace(/[%,()*\\_:"']/g, " ").replace(/\s+/g, " ").trim();
}

export async function buscarItensCatalogo(
  supabase: SupabaseClient<Database>,
  p: ParametrosBusca,
): Promise<ItemCatalogo[]> {
  const termo = sanitizarTermo(p.termo);
  const tipos = p.tipos ?? ["servico", "peca", "kit"];
  const limite = p.limitePorTipo ?? 6;
  const padrao = `%${termo}%`;

  const [tabela, servicos, pecas, kits] = await Promise.all([
    p.vePrecos && p.tabelaPrecoId ? carregarTabela(supabase, p.empresaId, p.tabelaPrecoId) : null,
    tipos.includes("servico") ? buscarServicos(supabase, p, padrao, limite) : [],
    tipos.includes("peca") ? buscarPecas(supabase, p, padrao, limite) : [],
    tipos.includes("kit") ? buscarKits(supabase, p, padrao, limite) : [],
  ]);

  // Preços específicos dos itens encontrados na tabela escolhida.
  const especificos = new Map<string, number>();
  if (p.vePrecos && p.tabelaPrecoId) {
    const idsServico = [...servicos.map((s) => s.id), ...kits.flatMap((k) => k.itens.map((i) => i.id))];
    const idsPeca = [...pecas.map((x) => x.id), ...kits.flatMap((k) => k.itens.map((i) => i.id))];
    if (idsServico.length > 0) {
      const { data } = await supabase
        .from("tabela_preco_itens")
        .select("servico_id, peca_id, preco")
        .eq("empresa_id", p.empresaId)
        .eq("tabela_preco_id", p.tabelaPrecoId)
        .or(`servico_id.in.(${idsServico.join(",")}),peca_id.in.(${idsPeca.join(",")})`);
      for (const i of data ?? []) {
        if (i.servico_id) especificos.set(chaveItem("servico", i.servico_id), Number(i.preco));
        if (i.peca_id) especificos.set(chaveItem("peca", i.peca_id), Number(i.preco));
      }
    }
  }
  const desconto = tabela?.desconto ?? 0;
  const efetivo = (tipo: "servico" | "peca", id: string, base: number | null) =>
    base === null
      ? null
      : precoEfetivo({
          precoBase: base,
          descontoPct: desconto,
          precoEspecifico: especificos.get(chaveItem(tipo, id)) ?? null,
        });

  return [
    ...servicos.map<ItemCatalogo>((s) => ({
      tipo: "servico",
      id: s.id,
      codigo: s.codigo,
      descricao: s.nome,
      unidade: s.unidade,
      precoSugerido: efetivo("servico", s.id, s.base),
      detalhe: s.categoria,
    })),
    ...pecas.map<ItemCatalogo>((x) => ({
      tipo: "peca",
      id: x.id,
      codigo: x.codigo,
      descricao: x.descricao,
      unidade: x.unidade,
      precoSugerido: efetivo("peca", x.id, x.base),
      detalhe: x.marca,
    })),
    ...kits.map<ItemCatalogo>((k) => ({
      tipo: "kit",
      id: k.id,
      codigo: null,
      descricao: k.nome,
      unidade: "kit",
      precoSugerido: p.vePrecos
        ? totalKit(
            k.itens.map((i) => ({
              quantidade: i.quantidade,
              preco: efetivo(i.tipo, i.id, i.base),
            })),
          )
        : null,
      detalhe: `${k.itens.length} ${k.itens.length === 1 ? "item" : "itens"}`,
    })),
  ];
}

async function carregarTabela(supabase: SupabaseClient<Database>, empresaId: string, id: string) {
  const { data } = await supabase
    .from("tabelas_preco")
    .select("desconto_padrao_pct")
    .eq("empresa_id", empresaId)
    .eq("id", id)
    .maybeSingle();
  return { desconto: Number(data?.desconto_padrao_pct ?? 0) };
}

type ServicoBusca = {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string | null;
  unidade: UnidadeServico;
  base: number | null;
};

async function buscarServicos(
  supabase: SupabaseClient<Database>,
  p: ParametrosBusca,
  padrao: string,
  limite: number,
): Promise<ServicoBusca[]> {
  const filtro = `nome.ilike.${padrao},codigo.ilike.${padrao},categoria.ilike.${padrao}`;
  if (p.vePrecos) {
    const { data } = await supabase
      .from("servicos")
      .select("id, codigo, nome, categoria, unidade, preco_base")
      .eq("empresa_id", p.empresaId)
      .eq("ativo", true)
      .or(filtro)
      .order("nome")
      .limit(limite);
    return (data ?? []).map((s) => ({ ...s, base: Number(s.preco_base) }));
  }
  const { data } = await supabase
    .from("v_servicos_catalogo")
    .select("id, codigo, nome, categoria, unidade")
    .eq("empresa_id", p.empresaId)
    .eq("ativo", true)
    .or(filtro)
    .order("nome")
    .limit(limite);
  return (data ?? []).flatMap((s) =>
    s.id && s.nome && s.unidade ? [{ ...s, id: s.id, nome: s.nome, unidade: s.unidade, base: null }] : [],
  );
}

type PecaBusca = {
  id: string;
  codigo: string | null;
  descricao: string;
  marca: string | null;
  unidade: string;
  base: number | null;
};

async function buscarPecas(
  supabase: SupabaseClient<Database>,
  p: ParametrosBusca,
  padrao: string,
  limite: number,
): Promise<PecaBusca[]> {
  const filtro = `descricao.ilike.${padrao},codigo.ilike.${padrao},marca.ilike.${padrao}`;
  if (p.vePrecos) {
    const { data } = await supabase
      .from("pecas")
      .select("id, codigo, descricao, marca, unidade, preco_venda")
      .eq("empresa_id", p.empresaId)
      .eq("ativo", true)
      .or(filtro)
      .order("descricao")
      .limit(limite);
    return (data ?? []).map((x) => ({ ...x, base: Number(x.preco_venda) }));
  }
  const { data } = await supabase
    .from("v_pecas_catalogo")
    .select("id, codigo, descricao, marca, unidade")
    .eq("empresa_id", p.empresaId)
    .eq("ativo", true)
    .or(filtro)
    .order("descricao")
    .limit(limite);
  return (data ?? []).flatMap((x) =>
    x.id && x.descricao && x.unidade
      ? [{ ...x, id: x.id, descricao: x.descricao, unidade: x.unidade, base: null }]
      : [],
  );
}

type KitBusca = {
  id: string;
  nome: string;
  itens: { tipo: "servico" | "peca"; id: string; quantidade: number; base: number | null }[];
};

async function buscarKits(
  supabase: SupabaseClient<Database>,
  p: ParametrosBusca,
  padrao: string,
  limite: number,
): Promise<KitBusca[]> {
  const { data } = await supabase
    .from("kits")
    .select("id, nome, kit_itens(servico_id, peca_id, quantidade)")
    .eq("empresa_id", p.empresaId)
    .eq("ativo", true)
    .ilike("nome", padrao)
    .order("nome")
    .limit(limite);
  const kits = data ?? [];
  if (!p.vePrecos) {
    return kits.map((k) => ({
      id: k.id,
      nome: k.nome,
      itens: k.kit_itens.map((i) => ({
        tipo: i.servico_id ? "servico" : "peca",
        id: (i.servico_id ?? i.peca_id) as string,
        quantidade: Number(i.quantidade),
        base: null,
      })),
    }));
  }
  const idsServico = [...new Set(kits.flatMap((k) => k.kit_itens.flatMap((i) => (i.servico_id ? [i.servico_id] : []))))];
  const idsPeca = [...new Set(kits.flatMap((k) => k.kit_itens.flatMap((i) => (i.peca_id ? [i.peca_id] : []))))];
  const [s, x] = await Promise.all([
    idsServico.length
      ? supabase.from("servicos").select("id, preco_base").in("id", idsServico)
      : Promise.resolve({ data: [] }),
    idsPeca.length
      ? supabase.from("pecas").select("id, preco_venda").in("id", idsPeca)
      : Promise.resolve({ data: [] }),
  ]);
  const base = new Map<string, number>();
  for (const r of s.data ?? []) base.set(chaveItem("servico", r.id), Number(r.preco_base));
  for (const r of x.data ?? []) base.set(chaveItem("peca", r.id), Number(r.preco_venda));
  return kits.map((k) => ({
    id: k.id,
    nome: k.nome,
    itens: k.kit_itens.map((i) => {
      const tipo = i.servico_id ? ("servico" as const) : ("peca" as const);
      const id = (i.servico_id ?? i.peca_id) as string;
      return { tipo, id, quantidade: Number(i.quantidade), base: base.get(chaveItem(tipo, id)) ?? null };
    }),
  }));
}
