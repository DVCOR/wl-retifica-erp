"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { BUCKET_ANEXOS, caminhoPertenceAOs } from "@/lib/recebimento/armazenamento";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  assinaturaSchema,
  atualizarItemSchema,
  marcarGrupoSchema,
  registrarAnexoSchema,
} from "@/lib/validacoes/recebimento";

const idSchema = z.string().uuid();

async function contexto(slug: string, osId: string, acao: "os.checklist" | "os.anexar_fotos") {
  if (!idSchema.safeParse(osId).success) return null;
  const ctx = await obterContextoEmpresa(slug);
  if (!pode(ctx.membro.papel, acao)) return null;
  return ctx;
}

export async function atualizarItemChecklistAction(
  slug: string,
  osId: string,
  itemId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = atualizarItemSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(itemId).success) return falha("Item inválido.");
  const ctx = await contexto(slug, osId, "os.checklist");
  if (!ctx) return falha("Sem permissão.");

  const patch: {
    status?: typeof dados.data.status;
    quantidade?: number | null;
    observacao?: string | null;
  } = {};
  if (dados.data.status !== undefined) patch.status = dados.data.status;
  if (dados.data.quantidade !== undefined) patch.quantidade = dados.data.quantidade;
  if (dados.data.observacao !== undefined) patch.observacao = dados.data.observacao || null;

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_checklist_itens")
    .update(patch)
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("id", itemId)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Item não encontrado ou sem permissão.");
  return sucesso();
}

/** Marca (ou desmarca) todos os itens de um grupo como N/A. */
export async function marcarGrupoAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ atualizados: number }>> {
  const dados = marcarGrupoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contexto(slug, osId, "os.checklist");
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_checklist_itens")
    .update({ status: dados.data.status })
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("grupo", dados.data.grupo)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  return sucesso({ atualizados: data?.length ?? 0 });
}

/** Registra no banco uma foto já enviada ao Storage. Idempotente (retentativas). */
export async function registrarAnexoAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = registrarAnexoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contexto(slug, osId, "os.anexar_fotos");
  if (!ctx) return falha("Sem permissão.");
  if (!caminhoPertenceAOs(dados.data.caminho, ctx.empresa.id, osId)) {
    return falha("Caminho do arquivo inválido.");
  }
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_anexos")
    .insert({
      empresa_id: ctx.empresa.id,
      os_id: osId,
      etapa: "recebimento",
      storage_path: dados.data.caminho,
      checklist_item_id: dados.data.checklist_item_id ?? null,
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
  return sucesso({ id: data.id });
}

export async function removerAnexoAction(
  slug: string,
  osId: string,
  anexoId: string,
): Promise<ResultadoAcao> {
  if (!idSchema.safeParse(anexoId).success) return falha("Foto inválida.");
  const ctx = await contexto(slug, osId, "os.anexar_fotos");
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_anexos")
    .delete()
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("id", anexoId)
    .select("storage_path");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Foto não encontrada ou sem permissão.");
  // melhor esforço: o registro já saiu; se o arquivo ficar órfão, não quebra nada
  await supabase.storage.from(BUCKET_ANEXOS).remove(data.map((d) => d.storage_path));
  return sucesso();
}

/** Confirma que o checklist foi revisado (pré-condição para `recebido`). */
export async function concluirChecklistAction(slug: string, osId: string): Promise<ResultadoAcao> {
  const ctx = await contexto(slug, osId, "os.checklist");
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os")
    .update({ checklist_concluido_em: new Date().toISOString() })
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", osId)
    .eq("status", "em_recebimento")
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("OS não está mais em recebimento.");
  return sucesso();
}

/**
 * Grava a assinatura e move a OS para `recebido`. Assinaturas são imutáveis no
 * banco, então, se o status falhar depois de assinar, a próxima tentativa reaproveita
 * a assinatura existente em vez de duplicar.
 */
export async function finalizarRecebimentoAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ pendencia?: string }>> {
  const dados = assinaturaSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contexto(slug, osId, "os.checklist");
  if (!ctx) return falha("Sem permissão.");
  if (!caminhoPertenceAOs(dados.data.caminho_imagem, ctx.empresa.id, osId)) {
    return falha("Caminho da assinatura inválido.");
  }
  const supabase = await criarClienteServidor();

  const { data: existente } = await supabase
    .from("os_assinaturas")
    .select("id")
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("tipo", "recebimento")
    .limit(1)
    .maybeSingle();

  if (!existente) {
    // Só assina se o resto já está em ordem (a assinatura não pode ser desfeita).
    const { data: pend } = await supabase.rpc("os_pendencias_para_status", {
      p_os_id: osId,
      p_para: "recebido",
    });
    if (pend && !/assinatura/i.test(pend)) return falha(pend);

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const { error } = await supabase.from("os_assinaturas").insert({
      empresa_id: ctx.empresa.id,
      os_id: osId,
      tipo: "recebimento",
      nome: dados.data.nome,
      documento: dados.data.documento,
      imagem_path: dados.data.caminho_imagem,
      ip,
      user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
      registrado_por: ctx.membro.id,
    });
    if (error) return falha(mensagemErroBanco(error));
  }

  const { error: erroStatus } = await supabase.rpc("alterar_status_os", {
    p_os_id: osId,
    p_status: "recebido",
  });
  if (erroStatus) {
    const { data: pend } = await supabase.rpc("os_pendencias_para_status", {
      p_os_id: osId,
      p_para: "recebido",
    });
    const msg = pend ?? mensagemErroBanco(erroStatus);
    return { ok: false, erro: msg };
  }
  revalidatePath(`/${slug}/os`);
  revalidatePath(`/${slug}/os/${osId}`);
  return sucesso({});
}
