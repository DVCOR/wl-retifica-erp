"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { caminhoPertenceAOs } from "@/lib/recebimento/armazenamento";
import { hojeSaoPaulo } from "@/lib/os/quadro";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  alterarStatusSchema,
  cancelarSchema,
  corrigirChecklistSchema,
  entregaSchema,
  fotoExecucaoSchema,
  garantiaOsSchema,
  iniciarApontamentoSchema,
  itemConcluidoSchema,
  trocarTecnicoSchema,
} from "@/lib/validacoes/os";

const idSchema = z.string().uuid();

function revalidar(slug: string, osId: string) {
  revalidatePath(`/${slug}/os`);
  revalidatePath(`/${slug}/os/${osId}`);
  revalidatePath(`/${slug}/bancada`);
}

/** Muda o status via RPC. Em falha, devolve as pendências do banco como mensagem. */
export async function moverStatusAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ status: string }>> {
  const dados = alterarStatusSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(osId).success) return falha("OS inválida.");
  const ctx = await obterContextoEmpresa(slug);
  if (!pode(ctx.membro.papel, "os.mudar_status")) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("alterar_status_os", {
    p_os_id: osId,
    p_status: dados.data.status,
    p_motivo: dados.data.motivo,
  });
  if (error) {
    const { data: pend } = await supabase.rpc("os_pendencias_para_status", {
      p_os_id: osId,
      p_para: dados.data.status,
    });
    return falha(pend ?? mensagemErroBanco(error));
  }
  revalidar(slug, osId);
  return sucesso({ status: dados.data.status });
}

export async function cancelarOsAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = cancelarSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(osId).success) return falha("OS inválida.");
  const ctx = await obterContextoEmpresa(slug);
  if (!pode(ctx.membro.papel, "os.cancelar")) return falha("Só o dono cancela uma OS.");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("alterar_status_os", {
    p_os_id: osId,
    p_status: "cancelado",
    p_motivo: dados.data.motivo,
  });
  if (error) return falha(mensagemErroBanco(error));
  revalidar(slug, osId);
  return sucesso();
}

export async function trocarTecnicoAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = trocarTecnicoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(osId).success) return falha("OS inválida.");
  const ctx = await obterContextoEmpresa(slug);
  if (!pode(ctx.membro.papel, "os.editar")) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os")
    .update({ tecnico_id: dados.data.tecnico_id })
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", osId)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("OS não encontrada ou sem permissão.");
  revalidar(slug, osId);
  return sucesso();
}

// ------------------------------------------------------------- apontamentos

async function contextoApontamento(slug: string, osId: string) {
  if (!idSchema.safeParse(osId).success) return null;
  const ctx = await obterContextoEmpresa(slug);
  if (!pode(ctx.membro.papel, "apontamento.registrar")) return null;
  return ctx;
}

/** Inicia um serviço. Encerra antes qualquer apontamento aberto do mesmo membro. */
export async function iniciarApontamentoAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = iniciarApontamentoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoApontamento(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const agora = new Date().toISOString();
  const { error: e1 } = await supabase
    .from("apontamentos")
    .update({ fim: agora })
    .eq("empresa_id", ctx.empresa.id)
    .eq("membro_id", ctx.membro.id)
    .is("fim", null);
  if (e1) return falha(mensagemErroBanco(e1));
  const { data, error } = await supabase
    .from("apontamentos")
    .insert({
      empresa_id: ctx.empresa.id,
      os_id: osId,
      membro_id: ctx.membro.id,
      orcamento_item_id: dados.data.orcamento_item_id ?? null,
      observacao: dados.data.observacao || null,
      inicio: agora,
    })
    .select("id")
    .single();
  if (error) return falha(mensagemErroBanco(error));
  revalidar(slug, osId);
  return sucesso({ id: data.id });
}

export async function pausarApontamentoAction(
  slug: string,
  osId: string,
  apontamentoId: string,
): Promise<ResultadoAcao> {
  if (!idSchema.safeParse(apontamentoId).success) return falha("Apontamento inválido.");
  const ctx = await contextoApontamento(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("apontamentos")
    .update({ fim: new Date().toISOString() })
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("id", apontamentoId)
    .is("fim", null)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Apontamento já encerrado.");
  revalidar(slug, osId);
  return sucesso();
}

/**
 * Marca/desmarca um serviço como concluído (`marcar_item_concluido`: OS em
 * execução/aguardando peça). Ao concluir, encerra o cronômetro aberto do item.
 */
export async function concluirItemAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = itemConcluidoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoApontamento(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  if (dados.data.concluido) {
    // encerra o cronômetro aberto deste item, se houver
    const { error: e1 } = await supabase
      .from("apontamentos")
      .update({ fim: new Date().toISOString() })
      .eq("empresa_id", ctx.empresa.id)
      .eq("os_id", osId)
      .eq("orcamento_item_id", dados.data.orcamento_item_id)
      .eq("membro_id", ctx.membro.id)
      .is("fim", null);
    if (e1) return falha(mensagemErroBanco(e1));
  }
  const { error } = await supabase.rpc("marcar_item_concluido", {
    p_item_id: dados.data.orcamento_item_id,
    p_concluido: dados.data.concluido,
  });
  if (error) return falha(mensagemErroBanco(error));
  revalidar(slug, osId);
  return sucesso();
}

export async function registrarFotoExecucaoAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = fotoExecucaoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(osId).success) return falha("OS inválida.");
  const ctx = await obterContextoEmpresa(slug);
  if (!pode(ctx.membro.papel, "os.anexar_fotos")) return falha("Sem permissão.");
  if (!caminhoPertenceAOs(dados.data.caminho, ctx.empresa.id, osId)) {
    return falha("Caminho do arquivo inválido.");
  }
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_anexos")
    .insert({
      empresa_id: ctx.empresa.id,
      os_id: osId,
      etapa: "execucao",
      storage_path: dados.data.caminho,
      legenda: dados.data.legenda || null,
      criado_por: ctx.membro.id,
    })
    .select("id")
    .single();
  if (error) return falha(mensagemErroBanco(error));
  revalidar(slug, osId);
  return sucesso({ id: data.id });
}

// ------------------------------------------------------------------ entrega

export async function entregarOsAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = entregaSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(osId).success) return falha("OS inválida.");
  const ctx = await obterContextoEmpresa(slug);
  if (!pode(ctx.membro.papel, "os.entregar")) return falha("Sem permissão para entregar.");
  if (!caminhoPertenceAOs(dados.data.caminho_imagem, ctx.empresa.id, osId)) {
    return falha("Caminho da assinatura inválido.");
  }
  const supabase = await criarClienteServidor();

  const { data: os } = await supabase
    .from("os")
    .select("status, garantia_dias")
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", osId)
    .maybeSingle();
  if (!os) return falha("OS não encontrada.");
  if (os.status !== "pronto" && os.status !== "reprovado") {
    return falha("A OS precisa estar pronta (ou reprovada, para devolução) para ser entregue.");
  }

  if (os.garantia_dias !== dados.data.garantia_dias) {
    const { data: up, error: eg } = await supabase
      .from("os")
      .update({ garantia_dias: dados.data.garantia_dias })
      .eq("empresa_id", ctx.empresa.id)
      .eq("id", osId)
      .select("id");
    if (eg) return falha(mensagemErroBanco(eg));
    if (!up || up.length === 0) return falha("Só dono ou balcão alteram os dias de garantia.");
  }

  const { data: existente } = await supabase
    .from("os_assinaturas")
    .select("id")
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("tipo", "entrega")
    .limit(1)
    .maybeSingle();
  if (!existente) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const { error } = await supabase.from("os_assinaturas").insert({
      empresa_id: ctx.empresa.id,
      os_id: osId,
      tipo: "entrega",
      nome: dados.data.nome,
      documento: dados.data.documento,
      imagem_path: dados.data.caminho_imagem,
      ip,
      user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
      registrado_por: ctx.membro.id,
    });
    if (error) return falha(mensagemErroBanco(error));
  }
  const { error: es } = await supabase.rpc("alterar_status_os", {
    p_os_id: osId,
    p_status: "entregue",
  });
  if (es) return falha(mensagemErroBanco(es));
  revalidar(slug, osId);
  return sucesso();
}

/** Cria a OS de garantia a partir de uma OS entregue dentro do prazo de garantia. */
export async function criarOsGarantiaAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = garantiaOsSchema.safeParse(entrada ?? {});
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(osId).success) return falha("OS inválida.");
  const ctx = await obterContextoEmpresa(slug);
  if (!pode(ctx.membro.papel, "os.abrir")) return falha("Sem permissão para abrir OS.");
  const supabase = await criarClienteServidor();
  const { data: o } = await supabase
    .from("os")
    .select(
      "status, garantia_ate, cliente_id, motor_id, cliente_final_nome, cliente_final_placa, cliente_final_telefone, tecnico_id",
    )
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", osId)
    .maybeSingle();
  if (!o) return falha("OS não encontrada.");
  if (o.status !== "entregue") return falha("Só OS entregues têm garantia.");
  if (!o.garantia_ate || o.garantia_ate < hojeSaoPaulo()) return falha("A garantia desta OS venceu.");
  const { data, error } = await supabase.rpc("criar_os", {
    p_empresa_id: ctx.empresa.id,
    p_cliente_id: o.cliente_id,
    p_motor_id: o.motor_id ?? undefined,
    p_cliente_final_nome: o.cliente_final_nome ?? undefined,
    p_cliente_final_placa: o.cliente_final_placa ?? undefined,
    p_cliente_final_telefone: o.cliente_final_telefone ?? undefined,
    p_os_origem_id: osId,
    p_tecnico_id: o.tecnico_id ?? undefined,
    p_observacoes: dados.data.observacoes ?? "Retorno em garantia",
  });
  if (error) return falha(mensagemErroBanco(error));
  revalidar(slug, osId);
  return sucesso({ id: data.id });
}

// ------------------------------------------------------------- checklist

/** Corrige um item do checklist depois do recebimento (só dono; motivo vai para a auditoria). */
export async function corrigirChecklistAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = corrigirChecklistSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(osId).success) return falha("OS inválida.");
  const ctx = await obterContextoEmpresa(slug);
  if (ctx.membro.papel !== "dono") return falha("Só o dono corrige o checklist depois do recebimento.");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("corrigir_checklist_os", {
    p_item_id: dados.data.item_id,
    p_motivo: dados.data.motivo,
    p_status: dados.data.status,
    ...(dados.data.quantidade !== null ? { p_quantidade: dados.data.quantidade } : {}),
    p_observacao: dados.data.observacao, // '' limpa a observação
  });
  if (error) return falha(mensagemErroBanco(error));
  revalidar(slug, osId);
  return sucesso();
}
