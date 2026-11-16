import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { chaveItem, precoEfetivo, totalKit, type UnidadeServico } from "@/lib/catalogo/calculos";
import type {
  ItemKit,
  KitLista,
  LinhaPrecoTabela,
  PecaLista,
  ServicoLista,
  TabelaPrecoLista,
} from "@/lib/catalogo/tipos";

/**
 * Leitura do catálogo (serviços, peças, tabelas de preço, kits). O técnico não
 * lê as tabelas com preço (RLS): quando `vePrecos` é falso usamos as views
 * `v_servicos_catalogo` / `v_pecas_catalogo`, que não têm colunas de preço.
 */

const num = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

export async function listarServicos(
  empresaId: string,
  vePrecos: boolean,
): Promise<ServicoLista[]> {
  const supabase = await criarClienteServidor();
  if (vePrecos) {
    const { data, error } = await supabase
      .from("servicos")
      .select("id, codigo, nome, categoria, unidade, preco_base, tempo_padrao_min, ativo")
      .eq("empresa_id", empresaId)
      .order("nome");
    if (error) throw new Error(`Erro ao listar serviços: ${error.message}`);
    return (data ?? []).map((s) => ({ ...s, preco_base: num(s.preco_base) }));
  }
  const { data, error } = await supabase
    .from("v_servicos_catalogo")
    .select("id, codigo, nome, categoria, unidade, tempo_padrao_min, ativo")
    .eq("empresa_id", empresaId)
    .order("nome");
  if (error) throw new Error(`Erro ao listar serviços: ${error.message}`);
  return (data ?? []).flatMap((s) =>
    s.id && s.nome && s.unidade
      ? [
          {
            id: s.id,
            codigo: s.codigo,
            nome: s.nome,
            categoria: s.categoria,
            unidade: s.unidade as UnidadeServico,
            preco_base: null,
            tempo_padrao_min: s.tempo_padrao_min,
            ativo: s.ativo ?? true,
          },
        ]
      : [],
  );
}

export async function listarPecas(empresaId: string, vePrecos: boolean): Promise<PecaLista[]> {
  const supabase = await criarClienteServidor();
  if (vePrecos) {
    const { data, error } = await supabase
      .from("pecas")
      .select("id, codigo, descricao, marca, unidade, custo, preco_venda, ativo")
      .eq("empresa_id", empresaId)
      .order("descricao");
    if (error) throw new Error(`Erro ao listar peças: ${error.message}`);
    return (data ?? []).map((p) => ({
      ...p,
      custo: num(p.custo),
      preco_venda: num(p.preco_venda),
    }));
  }
  const { data, error } = await supabase
    .from("v_pecas_catalogo")
    .select("id, codigo, descricao, marca, unidade, ativo")
    .eq("empresa_id", empresaId)
    .order("descricao");
  if (error) throw new Error(`Erro ao listar peças: ${error.message}`);
  return (data ?? []).flatMap((p) =>
    p.id && p.descricao && p.unidade
      ? [
          {
            id: p.id,
            codigo: p.codigo,
            descricao: p.descricao,
            marca: p.marca,
            unidade: p.unidade,
            custo: null,
            preco_venda: null,
            ativo: p.ativo ?? true,
          },
        ]
      : [],
  );
}

// ---------------------------------------------------------------------------
// Tabelas de preço
// ---------------------------------------------------------------------------

export async function listarTabelasPreco(empresaId: string): Promise<TabelaPrecoLista[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("tabelas_preco")
    .select("id, nome, desconto_padrao_pct, padrao_para, ativo")
    .eq("empresa_id", empresaId)
    .order("ativo", { ascending: false })
    .order("nome");
  if (error) throw new Error(`Erro ao listar tabelas de preço: ${error.message}`);
  const tabelas = data ?? [];

  // Contagens por tabela (head + count: não traz linhas, sem limite de 1000).
  return Promise.all(
    tabelas.map(async (t) => {
      const [explicitos, porPadrao, itens] = await Promise.all([
        supabase
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("tabela_preco_id", t.id),
        t.padrao_para && t.ativo
          ? supabase
              .from("clientes")
              .select("id", { count: "exact", head: true })
              .eq("empresa_id", empresaId)
              .is("tabela_preco_id", null)
              .eq("tipo", t.padrao_para)
          : Promise.resolve({ count: 0, error: null }),
        supabase
          .from("tabela_preco_itens")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("tabela_preco_id", t.id),
      ]);
      return {
        id: t.id,
        nome: t.nome,
        desconto_padrao_pct: Number(t.desconto_padrao_pct),
        padrao_para: t.padrao_para,
        ativo: t.ativo,
        clientes_explicitos: explicitos.count ?? 0,
        clientes_por_padrao: porPadrao.count ?? 0,
        itens_especificos: itens.count ?? 0,
      };
    }),
  );
}

export async function obterTabelaPreco(empresaId: string, id: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("tabelas_preco")
    .select("id, nome, desconto_padrao_pct, padrao_para, ativo")
    .eq("empresa_id", empresaId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar a tabela: ${error.message}`);
  if (!data) return null;
  return { ...data, desconto_padrao_pct: Number(data.desconto_padrao_pct) };
}

/** Grade de preços: todos os serviços e peças ativos, com o preço específico da tabela (se houver). */
export async function listarLinhasPrecoTabela(
  empresaId: string,
  tabelaId: string,
): Promise<LinhaPrecoTabela[]> {
  const supabase = await criarClienteServidor();
  const [servicos, pecas, itens] = await Promise.all([
    supabase
      .from("servicos")
      .select("id, codigo, nome, categoria, unidade, preco_base")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("pecas")
      .select("id, codigo, descricao, marca, unidade, preco_venda")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .order("descricao"),
    supabase
      .from("tabela_preco_itens")
      .select("servico_id, peca_id, preco")
      .eq("empresa_id", empresaId)
      .eq("tabela_preco_id", tabelaId),
  ]);
  if (servicos.error) throw new Error(`Erro ao listar serviços: ${servicos.error.message}`);
  if (pecas.error) throw new Error(`Erro ao listar peças: ${pecas.error.message}`);
  if (itens.error) throw new Error(`Erro ao listar preços da tabela: ${itens.error.message}`);

  const especificos = new Map<string, number>();
  for (const i of itens.data ?? []) {
    if (i.servico_id) especificos.set(chaveItem("servico", i.servico_id), Number(i.preco));
    if (i.peca_id) especificos.set(chaveItem("peca", i.peca_id), Number(i.preco));
  }

  return [
    ...(servicos.data ?? []).map<LinhaPrecoTabela>((s) => ({
      tipo: "servico",
      id: s.id,
      codigo: s.codigo,
      descricao: s.nome,
      grupo: s.categoria,
      unidade: s.unidade,
      preco_base: Number(s.preco_base),
      preco_especifico: especificos.get(chaveItem("servico", s.id)) ?? null,
    })),
    ...(pecas.data ?? []).map<LinhaPrecoTabela>((p) => ({
      tipo: "peca",
      id: p.id,
      codigo: p.codigo,
      descricao: p.descricao,
      grupo: p.marca,
      unidade: p.unidade,
      preco_base: Number(p.preco_venda),
      preco_especifico: especificos.get(chaveItem("peca", p.id)) ?? null,
    })),
  ];
}

/** Tabela usada para estimar kits: padrão para cliente final, senão lojista, senão nenhuma. */
export function escolherTabelaEstimativa<
  T extends { id: string; padrao_para: string | null; ativo: boolean },
>(tabelas: readonly T[]): T | null {
  const ativas = tabelas.filter((t) => t.ativo);
  return (
    ativas.find((t) => t.padrao_para === "final") ??
    ativas.find((t) => t.padrao_para === "lojista") ??
    null
  );
}

// ---------------------------------------------------------------------------
// Kits
// ---------------------------------------------------------------------------

type KitItemBruto = {
  servico_id: string | null;
  peca_id: string | null;
  quantidade: number | string;
  ordem: number;
};

/**
 * Kits com itens. Com `vePrecos`, calcula o preço efetivo por item e o total
 * estimado na tabela `tabelaId` (ou pelo preço base quando não há tabela).
 */
export async function listarKits(
  empresaId: string,
  opcoes: { vePrecos: boolean; tabelaId?: string | null; kitId?: string },
): Promise<KitLista[]> {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("kits")
    .select("id, nome, descricao, ativo, kit_itens(servico_id, peca_id, quantidade, ordem)")
    .eq("empresa_id", empresaId)
    .order("ativo", { ascending: false })
    .order("nome");
  if (opcoes.kitId) q = q.eq("id", opcoes.kitId);
  const { data, error } = await q;
  if (error) throw new Error(`Erro ao listar kits: ${error.message}`);
  const kits = data ?? [];

  const idsServico = new Set<string>();
  const idsPeca = new Set<string>();
  for (const k of kits)
    for (const i of k.kit_itens as KitItemBruto[]) {
      if (i.servico_id) idsServico.add(i.servico_id);
      if (i.peca_id) idsPeca.add(i.peca_id);
    }

  const [servicos, pecas, tabelaPrecos] = await Promise.all([
    idsServico.size
      ? opcoes.vePrecos
        ? supabase
            .from("servicos")
            .select("id, nome, unidade, preco_base")
            .in("id", [...idsServico])
        : supabase
            .from("v_servicos_catalogo")
            .select("id, nome, unidade")
            .in("id", [...idsServico])
      : Promise.resolve({ data: [], error: null }),
    idsPeca.size
      ? opcoes.vePrecos
        ? supabase
            .from("pecas")
            .select("id, descricao, unidade, preco_venda")
            .in("id", [...idsPeca])
        : supabase
            .from("v_pecas_catalogo")
            .select("id, descricao, unidade")
            .in("id", [...idsPeca])
      : Promise.resolve({ data: [], error: null }),
    opcoes.vePrecos && opcoes.tabelaId
      ? carregarPrecosTabela(empresaId, opcoes.tabelaId)
      : Promise.resolve({ desconto: 0, especificos: new Map<string, number>() }),
  ]);
  if (servicos.error)
    throw new Error(`Erro ao carregar serviços do kit: ${servicos.error.message}`);
  if (pecas.error) throw new Error(`Erro ao carregar peças do kit: ${pecas.error.message}`);

  type Info = { descricao: string; unidade: string; base: number | null };
  const infoServico = new Map<string, Info>();
  for (const s of (servicos.data ?? []) as {
    id: string;
    nome: string;
    unidade: string;
    preco_base?: number | string;
  }[])
    infoServico.set(s.id, { descricao: s.nome, unidade: s.unidade, base: num(s.preco_base) });
  const infoPeca = new Map<string, Info>();
  for (const p of (pecas.data ?? []) as {
    id: string;
    descricao: string;
    unidade: string;
    preco_venda?: number | string;
  }[])
    infoPeca.set(p.id, { descricao: p.descricao, unidade: p.unidade, base: num(p.preco_venda) });

  return kits.map((k) => {
    const itens = [...(k.kit_itens as KitItemBruto[])]
      .sort((a, b) => a.ordem - b.ordem)
      .flatMap<ItemKit>((i) => {
        const tipo = i.servico_id ? "servico" : "peca";
        const id = (i.servico_id ?? i.peca_id) as string;
        const info = (tipo === "servico" ? infoServico : infoPeca).get(id);
        if (!info) return [];
        const preco =
          opcoes.vePrecos && info.base !== null
            ? precoEfetivo({
                precoBase: info.base,
                descontoPct: tabelaPrecos.desconto,
                precoEspecifico: tabelaPrecos.especificos.get(chaveItem(tipo, id)) ?? null,
              })
            : null;
        return [
          {
            tipo,
            id,
            descricao: info.descricao,
            unidade: info.unidade,
            quantidade: Number(i.quantidade),
            preco,
          },
        ];
      });
    return {
      id: k.id,
      nome: k.nome,
      descricao: k.descricao,
      ativo: k.ativo,
      itens,
      total: opcoes.vePrecos ? totalKit(itens) : null,
    };
  });
}

async function carregarPrecosTabela(empresaId: string, tabelaId: string) {
  const supabase = await criarClienteServidor();
  const [tabela, itens] = await Promise.all([
    supabase
      .from("tabelas_preco")
      .select("desconto_padrao_pct")
      .eq("empresa_id", empresaId)
      .eq("id", tabelaId)
      .maybeSingle(),
    supabase
      .from("tabela_preco_itens")
      .select("servico_id, peca_id, preco")
      .eq("empresa_id", empresaId)
      .eq("tabela_preco_id", tabelaId),
  ]);
  if (tabela.error) throw new Error(`Erro ao carregar a tabela: ${tabela.error.message}`);
  if (itens.error) throw new Error(`Erro ao carregar preços da tabela: ${itens.error.message}`);
  const especificos = new Map<string, number>();
  for (const i of itens.data ?? []) {
    if (i.servico_id) especificos.set(chaveItem("servico", i.servico_id), Number(i.preco));
    if (i.peca_id) especificos.set(chaveItem("peca", i.peca_id), Number(i.preco));
  }
  return { desconto: Number(tabela.data?.desconto_padrao_pct ?? 0), especificos };
}

export type TabelaResumo = {
  id: string;
  nome: string;
  padrao_para: "lojista" | "final" | null;
  ativo: boolean;
};

/** Tabelas de preço sem contagens (para seletores). */
export async function listarTabelasResumo(empresaId: string): Promise<TabelaResumo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("tabelas_preco")
    .select("id, nome, padrao_para, ativo")
    .eq("empresa_id", empresaId)
    .order("nome");
  if (error) throw new Error(`Erro ao listar tabelas de preço: ${error.message}`);
  return data ?? [];
}
