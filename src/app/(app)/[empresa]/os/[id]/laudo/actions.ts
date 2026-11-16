"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { pode, podeVerPrecos, type Acao } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { obterRascunhoParaSugestao } from "@/lib/data/orcamento";
import { calcularConformidade } from "@/lib/orcamento/medicao";
import { caminhoPertenceAOs } from "@/lib/recebimento/armazenamento";
import { criarClienteServidor } from "@/lib/supabase/server";
import { anexoMedicaoSchema, medicaoSchema, sugerirItemSchema } from "@/lib/validacoes/orcamento";

const idSchema = z.string().uuid();

async function contexto(slug: string, osId: string, acao: Acao) {
  if (!idSchema.safeParse(osId).success) return null;
  const ctx = await obterContextoEmpresa(slug);
  return pode(ctx.membro.papel, acao) ? ctx : null;
}

function atualizar(slug: string, osId: string) {
  revalidatePath(`/${slug}/os/${osId}/laudo`);
  revalidatePath(`/${slug}/os/${osId}`);
  revalidatePath(`/${slug}/os/${osId}/orcamento`);
}

/** Cria (medicaoId = null) ou edita uma medição. A conformidade é calculada. */
export async function salvarMedicaoAction(
  slug: string,
  osId: string,
  medicaoId: string | null,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string; conforme: boolean | null }>> {
  const dados = medicaoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (medicaoId !== null && !idSchema.safeParse(medicaoId).success) return falha("Medição inválida.");
  const ctx = await contexto(slug, osId, "laudo.registrar");
  if (!ctx) return falha("Sem permissão.");

  const m = dados.data;
  const numerica = m.tipo === "numerica";
  const valor = numerica ? (m.valor ?? null) : null;
  const minimo = numerica ? (m.minimo ?? null) : null;
  const maximo = numerica ? (m.maximo ?? null) : null;
  const conforme = numerica ? calcularConformidade(valor, minimo, maximo) : (m.aprovado ?? null);
  const linha = {
    componente: m.componente,
    descricao: m.descricao,
    valor,
    valor_texto: numerica ? null : m.aprovado ? "Aprovado" : "Reprovado",
    unidade: numerica ? m.unidade : null,
    minimo,
    maximo,
    conforme,
    observacao: m.observacao,
  };

  const supabase = await criarClienteServidor();
  if (medicaoId === null) {
    const { data, error } = await supabase
      .from("os_medicoes")
      .insert({ ...linha, empresa_id: ctx.empresa.id, os_id: osId })
      .select("id, conforme")
      .single();
    if (error) return falha(mensagemErroBanco(error));
    atualizar(slug, osId);
    return sucesso({ id: data.id, conforme: data.conforme });
  }
  const { data, error } = await supabase
    .from("os_medicoes")
    .update(linha)
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("id", medicaoId)
    .select("id, conforme");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Medição não encontrada.");
  atualizar(slug, osId);
  return sucesso({ id: data[0].id, conforme: data[0].conforme });
}

export async function removerMedicaoAction(
  slug: string,
  osId: string,
  medicaoId: string,
): Promise<ResultadoAcao> {
  if (!idSchema.safeParse(medicaoId).success) return falha("Medição inválida.");
  const ctx = await contexto(slug, osId, "laudo.registrar");
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_medicoes")
    .delete()
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("id", medicaoId)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Medição não encontrada.");
  atualizar(slug, osId);
  return sucesso();
}

/** Registra no banco a foto de uma medição já enviada ao Storage (etapa análise). */
export async function registrarFotoMedicaoAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = anexoMedicaoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contexto(slug, osId, "laudo.registrar");
  if (!ctx) return falha("Sem permissão.");
  if (!caminhoPertenceAOs(dados.data.caminho, ctx.empresa.id, osId))
    return falha("Caminho do arquivo inválido.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_anexos")
    .insert({
      empresa_id: ctx.empresa.id,
      os_id: osId,
      etapa: "analise",
      medicao_id: dados.data.medicao_id,
      storage_path: dados.data.caminho,
      criado_por: ctx.membro.id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: existente } = await supabase
        .from("os_anexos")
        .select("id")
        .eq("empresa_id", ctx.empresa.id)
        .eq("storage_path", dados.data.caminho)
        .maybeSingle();
      if (existente) return sucesso({ id: existente.id });
    }
    return falha(mensagemErroBanco(error));
  }
  atualizar(slug, osId);
  return sucesso({ id: data.id });
}

export async function removerFotoMedicaoAction(
  slug: string,
  osId: string,
  anexoId: string,
): Promise<ResultadoAcao> {
  if (!idSchema.safeParse(anexoId).success) return falha("Foto inválida.");
  const ctx = await contexto(slug, osId, "laudo.registrar");
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_anexos")
    .delete()
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("id", anexoId)
    .eq("etapa", "analise")
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Sem permissão para apagar esta foto.");
  atualizar(slug, osId);
  return sucesso();
}

/**
 * Sugere um item de orçamento a partir de uma medição não conforme. O técnico
 * só insere (o banco define preço pela tabela do cliente e grava `sugerido_por`).
 */
export async function sugerirItemAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = sugerirItemSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contexto(slug, osId, "orcamento.sugerir_itens");
  if (!ctx) return falha("Sem permissão.");

  const podeLer = podeVerPrecos(ctx.membro.papel, ctx.empresa.config);
  const supabase = await criarClienteServidor();
  const rasc = await obterRascunhoParaSugestao(ctx.empresa.id, osId, podeLer);
  let orcamentoId = rasc.id;

  if (!orcamentoId) {
    if (rasc.ultimoStatus && rasc.ultimoStatus !== "rascunho")
      return falha("O orçamento já foi enviado: peça ao balcão para criar uma nova versão.");
    if (!pode(ctx.membro.papel, "orcamento.montar"))
      return falha("O balcão ainda não abriu o orçamento desta OS. Avise o balcão e tente de novo.");
    const { data, error } = await supabase
      .from("orcamentos")
      .insert({ empresa_id: ctx.empresa.id, os_id: osId, versao: 0 })
      .select("id")
      .single();
    if (error) return falha(mensagemErroBanco(error));
    orcamentoId = data.id;
  }

  // Sem .select(): o técnico não pode ler a linha de volta.
  const { error } = await supabase.from("orcamento_itens").insert({
    empresa_id: ctx.empresa.id,
    orcamento_id: orcamentoId,
    tipo: dados.data.tipo,
    servico_id: dados.data.tipo === "servico" ? dados.data.item_id : null,
    peca_id: dados.data.tipo === "peca" ? dados.data.item_id : null,
    descricao: dados.data.descricao,
    quantidade: dados.data.quantidade,
    sugerido_por_medicao_id: dados.data.medicao_id ?? null,
    sugerido_por: ctx.membro.id,
  });
  if (error) return falha(mensagemErroBanco(error));
  atualizar(slug, osId);
  return sucesso();
}
