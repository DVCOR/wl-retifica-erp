import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BUCKET_ANEXOS } from "@/lib/recebimento/armazenamento";
import type { ItemChecklist } from "@/lib/recebimento/divergencias";
import type { Database } from "@/lib/supabase/types";
import type { ClienteResumo, MotorResumo } from "@/lib/recebimento/tipos";

/**
 * Dados do módulo Recebimento (Nova OS). Funções server-only: usam a sessão do
 * usuário, então a RLS filtra por empresa e papel.
 */

export type { ClienteResumo, MotorResumo };

const COLUNAS_CLIENTE = "id, nome, nome_fantasia, tipo, telefone_whatsapp, documento";
const COLUNAS_MOTOR =
  "id, marca, modelo, codigo_motor, numero_serie, combustivel, cilindros, veiculo_placa";

export async function obterClienteParaOs(
  empresaId: string,
  clienteId: string,
): Promise<ClienteResumo | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .select(COLUNAS_CLIENTE)
    .eq("empresa_id", empresaId)
    .eq("id", clienteId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar o cliente: ${error.message}`);
  return data;
}

export type FotoOs = {
  id: string;
  storage_path: string;
  checklist_item_id: string | null;
  url: string | null;
};

export type OsRecebimento = {
  id: string;
  numero: string;
  status: Database["public"]["Enums"]["os_status"];
  prazo_prometido: string | null;
  observacoes: string | null;
  cliente_final_nome: string | null;
  cliente_final_placa: string | null;
  cliente_final_telefone: string | null;
  checklist_concluido_em: string | null;
  token_publico: string;
  cliente: ClienteResumo;
  motor: MotorResumo | null;
  itens: ItemChecklist[];
  fotos: FotoOs[];
  assinatura: { nome: string; documento: string | null; created_at: string } | null;
  pendenciaRecebido: string | null;
};

/** Carrega a OS em recebimento com checklist, fotos (URLs assinadas) e assinatura. */
export async function obterOsRecebimento(
  empresaId: string,
  osId: string,
): Promise<OsRecebimento | null> {
  const supabase = await criarClienteServidor();
  const { data: os, error } = await supabase
    .from("os")
    .select(
      "id, numero, status, prazo_prometido, observacoes, cliente_id, motor_id, cliente_final_nome, cliente_final_placa, cliente_final_telefone, checklist_concluido_em",
    )
    .eq("empresa_id", empresaId)
    .eq("id", osId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar a OS: ${error.message}`);
  if (!os) return null;

  const [cliente, motor, itensRes, anexosRes, assinaturaRes, pendenciaRes, linkRes] =
    await Promise.all([
      obterClienteParaOs(empresaId, os.cliente_id),
      os.motor_id
        ? supabase
            .from("motores")
            .select(COLUNAS_MOTOR)
            .eq("empresa_id", empresaId)
            .eq("id", os.motor_id)
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
      supabase
        .from("os_checklist_itens")
        .select("id, grupo, descricao, ordem, exige_quantidade, status, quantidade, observacao")
        .eq("empresa_id", empresaId)
        .eq("os_id", osId)
        .order("ordem"),
      supabase
        .from("os_anexos")
        .select("id, storage_path, checklist_item_id")
        .eq("empresa_id", empresaId)
        .eq("os_id", osId)
        .eq("etapa", "recebimento")
        .order("created_at"),
      supabase
        .from("os_assinaturas")
        .select("nome, documento, created_at")
        .eq("empresa_id", empresaId)
        .eq("os_id", osId)
        .eq("tipo", "recebimento")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      os.status === "em_recebimento"
        ? supabase.rpc("os_pendencias_para_status", { p_os_id: osId, p_para: "recebido" })
        : Promise.resolve({ data: null, error: null }),
      // token do link público: só dono/balcão (a coluna não é legível por todos)
      supabase.rpc("os_link_publico", { p_os_id: osId }),
    ]);
  if (!cliente) return null;
  if (itensRes.error) throw new Error(`Erro ao carregar o checklist: ${itensRes.error.message}`);
  if (anexosRes.error) throw new Error(`Erro ao carregar as fotos: ${anexosRes.error.message}`);

  const anexos = anexosRes.data ?? [];
  const urls = new Map<string, string>();
  if (anexos.length > 0) {
    const { data: assinadas } = await supabase.storage.from(BUCKET_ANEXOS).createSignedUrls(
      anexos.map((a) => a.storage_path),
      3600,
    );
    for (const a of assinadas ?? []) {
      if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
    }
  }

  return {
    id: os.id,
    numero: os.numero,
    status: os.status,
    prazo_prometido: os.prazo_prometido,
    observacoes: os.observacoes,
    cliente_final_nome: os.cliente_final_nome,
    cliente_final_placa: os.cliente_final_placa,
    cliente_final_telefone: os.cliente_final_telefone,
    checklist_concluido_em: os.checklist_concluido_em,
    token_publico: linkRes.data ?? "",
    cliente,
    motor,
    itens: (itensRes.data ?? []).map((i) => ({
      ...i,
      quantidade: i.quantidade === null ? null : Number(i.quantidade),
    })),
    fotos: anexos.map((a) => ({
      id: a.id,
      storage_path: a.storage_path,
      checklist_item_id: a.checklist_item_id,
      url: urls.get(a.storage_path) ?? null,
    })),
    assinatura: assinaturaRes.data ?? null,
    pendenciaRecebido: typeof pendenciaRes.data === "string" ? pendenciaRes.data : null,
  };
}

export type DadosComprovante = {
  empresa: {
    nome_fantasia: string;
    razao_social: string | null;
    cnpj: string | null;
    telefone: string | null;
    email: string | null;
    endereco: Record<string, string | undefined>;
  };
  os: OsRecebimento;
  recebidoPor: string | null;
  recebidoEm: string | null;
  /** Miniaturas das fotos gerais (JPEG), até 8. */
  miniaturas: Buffer[];
  assinaturaImagem: Buffer | null;
};

async function baixar(caminho: string): Promise<Buffer | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.storage.from(BUCKET_ANEXOS).download(caminho);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Tudo que o PDF de comprovante precisa (fotos e assinatura já em memória). */
export async function obterDadosComprovante(
  empresaId: string,
  osId: string,
): Promise<DadosComprovante | null> {
  const os = await obterOsRecebimento(empresaId, osId);
  if (!os) return null;
  const supabase = await criarClienteServidor();

  const [empresaRes, assinaturaRes, historicoRes] = await Promise.all([
    supabase
      .from("empresas")
      .select("nome_fantasia, razao_social, cnpj, telefone, email, endereco")
      .eq("id", empresaId)
      .maybeSingle(),
    supabase
      .from("os_assinaturas")
      .select("imagem_path")
      .eq("empresa_id", empresaId)
      .eq("os_id", osId)
      .eq("tipo", "recebimento")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("os_status_historico")
      .select("created_at, membro_id")
      .eq("empresa_id", empresaId)
      .eq("os_id", osId)
      .eq("status_para", "recebido")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!empresaRes.data) return null;

  let recebidoPor: string | null = null;
  if (historicoRes.data?.membro_id) {
    const { data: m } = await supabase
      .from("membros")
      .select("nome")
      .eq("empresa_id", empresaId)
      .eq("id", historicoRes.data.membro_id)
      .maybeSingle();
    recebidoPor = m?.nome ?? null;
  }

  const gerais = os.fotos.filter((f) => f.checklist_item_id === null).slice(0, 8);
  const [miniaturas, assinaturaImagem] = await Promise.all([
    Promise.all(gerais.map((f) => baixar(f.storage_path))),
    assinaturaRes.data?.imagem_path
      ? baixar(assinaturaRes.data.imagem_path)
      : Promise.resolve(null),
  ]);

  return {
    empresa: {
      ...empresaRes.data,
      endereco: (empresaRes.data.endereco ?? {}) as Record<string, string | undefined>,
    },
    os,
    recebidoPor,
    recebidoEm: historicoRes.data?.created_at ?? null,
    miniaturas: miniaturas.filter((b): b is Buffer => b !== null),
    assinaturaImagem,
  };
}
