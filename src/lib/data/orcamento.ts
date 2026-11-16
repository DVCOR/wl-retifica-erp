import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BUCKET_ANEXOS } from "@/lib/recebimento/armazenamento";
import type { Database } from "@/lib/supabase/types";

/**
 * Dados do módulo Orçamento/Laudo (sessão do usuário: a RLS decide o que cada
 * papel lê). Técnico não lê orcamentos/itens com preço: use as funções `...SemPreco`.
 */

export type OrcamentoRow = Database["public"]["Tables"]["orcamentos"]["Row"];
export type ItemOrcamentoRow = Database["public"]["Tables"]["orcamento_itens"]["Row"];
export type MedicaoRow = Database["public"]["Tables"]["os_medicoes"]["Row"];

export type OsOrcamento = {
  id: string;
  numero: string;
  status: Database["public"]["Enums"]["os_status"];
  token_publico: string;
  cliente: {
    id: string;
    nome: string;
    telefone_whatsapp: string | null;
    tabela_preco_id: string | null;
  };
  motor: {
    id: string;
    marca: string | null;
    modelo: string | null;
    codigo_motor: string | null;
    cilindros: number | null;
    veiculo_placa: string | null;
  } | null;
};

export async function obterOsOrcamento(empresaId: string, osId: string): Promise<OsOrcamento | null> {
  const supabase = await criarClienteServidor();
  const { data: os, error } = await supabase
    .from("os")
    .select("id, numero, status, token_publico, cliente_id, motor_id")
    .eq("empresa_id", empresaId)
    .eq("id", osId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar a OS: ${error.message}`);
  if (!os) return null;

  const [cli, mot] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, telefone_whatsapp, tabela_preco_id")
      .eq("empresa_id", empresaId)
      .eq("id", os.cliente_id)
      .maybeSingle(),
    os.motor_id
      ? supabase
          .from("motores")
          .select("id, marca, modelo, codigo_motor, cilindros, veiculo_placa")
          .eq("empresa_id", empresaId)
          .eq("id", os.motor_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (!cli.data) return null;
  return {
    id: os.id,
    numero: os.numero,
    status: os.status,
    token_publico: os.token_publico,
    cliente: cli.data,
    motor: mot.data ?? null,
  };
}

/** Todas as versões do orçamento da OS, da mais nova para a mais antiga. */
export async function listarVersoes(empresaId: string, osId: string): Promise<OrcamentoRow[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("os_id", osId)
    .order("versao", { ascending: false });
  if (error) throw new Error(`Erro ao listar versões: ${error.message}`);
  return data ?? [];
}

export async function listarItensOrcamento(
  empresaId: string,
  orcamentoId: string,
): Promise<ItemOrcamentoRow[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamento_itens")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("orcamento_id", orcamentoId)
    .order("ordem")
    .order("created_at");
  if (error) throw new Error(`Erro ao listar itens: ${error.message}`);
  return data ?? [];
}

export type MedicaoComFotos = MedicaoRow & {
  fotos: { id: string; url: string | null }[];
  membro_nome: string | null;
};

export async function listarMedicoes(empresaId: string, osId: string): Promise<MedicaoComFotos[]> {
  const supabase = await criarClienteServidor();
  const [med, anexos] = await Promise.all([
    supabase
      .from("os_medicoes")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("os_id", osId)
      .order("created_at"),
    supabase
      .from("os_anexos")
      .select("id, storage_path, medicao_id")
      .eq("empresa_id", empresaId)
      .eq("os_id", osId)
      .not("medicao_id", "is", null)
      .order("created_at"),
  ]);
  if (med.error) throw new Error(`Erro ao listar medições: ${med.error.message}`);
  const lista = anexos.data ?? [];
  const urls = new Map<string, string>();
  if (lista.length > 0) {
    const { data } = await supabase.storage.from(BUCKET_ANEXOS).createSignedUrls(
      lista.map((a) => a.storage_path),
      3600,
    );
    for (const u of data ?? []) if (u.path && u.signedUrl) urls.set(u.path, u.signedUrl);
  }
  const ids = [...new Set((med.data ?? []).map((m) => m.membro_id).filter((x): x is string => !!x))];
  const nomes = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("membros").select("id, nome").in("id", ids);
    for (const m of data ?? []) nomes.set(m.id, m.nome);
  }
  return (med.data ?? []).map((m) => ({
    ...m,
    membro_nome: m.membro_id ? (nomes.get(m.membro_id) ?? null) : null,
    fotos: lista
      .filter((a) => a.medicao_id === m.id)
      .map((a) => ({ id: a.id, url: urls.get(a.storage_path) ?? null })),
  }));
}

export type ResumoOrcamento = {
  versao: number;
  status: OrcamentoRow["status"];
  total: number;
  validade: string | null;
  itens: number;
};

export async function obterResumoOrcamento(
  empresaId: string,
  osId: string,
): Promise<ResumoOrcamento | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("orcamentos")
    .select("id, versao, status, total, validade")
    .eq("empresa_id", empresaId)
    .eq("os_id", osId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const { count } = await supabase
    .from("orcamento_itens")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .eq("orcamento_id", data.id);
  return {
    versao: data.versao,
    status: data.status,
    total: Number(data.total),
    validade: data.validade,
    itens: count ?? 0,
  };
}

export async function obterEmpresaPdf(empresaId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("empresas")
    .select("nome_fantasia, telefone, email, endereco, config")
    .eq("id", empresaId)
    .maybeSingle();
  return data;
}

export async function obterSlugEmpresa(empresaId: string): Promise<string | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("empresas").select("slug").eq("id", empresaId).maybeSingle();
  return data?.slug ?? null;
}

export async function obterEmpresaIdDaOs(osId: string): Promise<string | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("os").select("empresa_id").eq("id", osId).maybeSingle();
  return data?.empresa_id ?? null;
}

export async function obterNomeMembro(membroId: string | null): Promise<string | null> {
  if (!membroId) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("membros").select("nome").eq("id", membroId).maybeSingle();
  return data?.nome ?? null;
}
