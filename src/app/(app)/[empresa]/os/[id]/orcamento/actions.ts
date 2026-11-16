"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { pode, type Acao } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { SITE_URL } from "@/lib/env";
import { avaliarDesconto, calcularTotais } from "@/lib/orcamento/calculos";
import { modoLocal } from "@/lib/modo";
import { linkPublicoOs } from "@/lib/orcamento/mensagens";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  adicionarItemSchema,
  adicionarKitSchema,
  atualizarItemSchema,
  atualizarOrcamentoSchema,
  respostaPresencialSchema,
} from "@/lib/validacoes/orcamento";

const idSchema = z.string().uuid();

async function contexto(slug: string, osId: string, acao: Acao = "orcamento.montar") {
  if (!idSchema.safeParse(osId).success) return null;
  const ctx = await obterContextoEmpresa(slug);
  return pode(ctx.membro.papel, acao) ? ctx : null;
}

function atualizar(slug: string, osId: string) {
  revalidatePath(`/${slug}/os/${osId}/orcamento`);
  revalidatePath(`/${slug}/os/${osId}`);
}

/**
 * Devolve o rascunho da OS; se a versão mais nova já saiu do rascunho (ou não
 * há orçamento), cria uma nova versão — o banco marca as anteriores como
 * `substituido` — copiando itens, desconto e observações da versão anterior.
 */
export async function criarVersaoAction(
  slug: string,
  osId: string,
): Promise<ResultadoAcao<{ id: string; versao: number }>> {
  const ctx = await contexto(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();

  const { data: ultima } = await supabase
    .from("orcamentos")
    .select("id, versao, status, desconto, observacoes")
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultima?.status === "rascunho") return sucesso({ id: ultima.id, versao: ultima.versao });

  const { data: nova, error } = await supabase
    .from("orcamentos")
    .insert({ empresa_id: ctx.empresa.id, os_id: osId, versao: 0 }) // versão real: trigger
    .select("id, versao")
    .single();
  if (error) return falha(mensagemErroBanco(error));

  if (ultima) {
    const { data: itens } = await supabase
      .from("orcamento_itens")
      .select(
        "tipo, servico_id, peca_id, descricao, quantidade, preco_unitario, desconto, ordem, sugerido_por_medicao_id, sugerido_por",
      )
      .eq("empresa_id", ctx.empresa.id)
      .eq("orcamento_id", ultima.id);
    if (itens && itens.length > 0) {
      const { error: errItens } = await supabase
        .from("orcamento_itens")
        .insert(itens.map((i) => ({ ...i, empresa_id: ctx.empresa.id, orcamento_id: nova.id })));
      if (errItens) return falha(mensagemErroBanco(errItens));
    }
    await supabase
      .from("orcamentos")
      .update({ desconto: Number(ultima.desconto), observacoes: ultima.observacoes })
      .eq("empresa_id", ctx.empresa.id)
      .eq("id", nova.id);
  }
  atualizar(slug, osId);
  return sucesso({ id: nova.id, versao: nova.versao });
}

async function rascunhoDaOs(empresaId: string, osId: string, orcamentoId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("orcamentos")
    .select("id, status")
    .eq("empresa_id", empresaId)
    .eq("os_id", osId)
    .eq("id", orcamentoId)
    .maybeSingle();
  return data;
}

export async function adicionarItemAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = adicionarItemSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contexto(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const orc = await rascunhoDaOs(ctx.empresa.id, osId, dados.data.orcamento_id);
  if (!orc) return falha("Orçamento não encontrado.");
  if (orc.status !== "rascunho") return falha("Orçamento já enviado: crie uma nova versão.");

  const supabase = await criarClienteServidor();
  const { data: os } = await supabase
    .from("os")
    .select("motor_id")
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", osId)
    .maybeSingle();

  let quantidade = 1;
  if (dados.data.tipo === "servico") {
    const { data: q } = await supabase.rpc("quantidade_sugerida", {
      p_servico_id: dados.data.item_id,
      p_motor_id: os?.motor_id ?? (undefined as unknown as string),
    });
    if (q && Number(q) > 0) quantidade = Number(q);
  }
  const { data: ultimo } = await supabase
    .from("orcamento_itens")
    .select("ordem")
    .eq("orcamento_id", orc.id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("orcamento_itens").insert({
    empresa_id: ctx.empresa.id,
    orcamento_id: orc.id,
    tipo: dados.data.tipo,
    servico_id: dados.data.tipo === "servico" ? dados.data.item_id : null,
    peca_id: dados.data.tipo === "peca" ? dados.data.item_id : null,
    descricao: dados.data.descricao,
    quantidade,
    ordem: (ultimo?.ordem ?? 0) + 1,
  });
  if (error) return falha(mensagemErroBanco(error));
  atualizar(slug, osId);
  return sucesso();
}

export async function adicionarKitAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ itens: number }>> {
  const dados = adicionarKitSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contexto(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const orc = await rascunhoDaOs(ctx.empresa.id, osId, dados.data.orcamento_id);
  if (!orc || orc.status !== "rascunho") return falha("Orçamento não está em rascunho.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("adicionar_kit_orcamento", {
    p_orcamento_id: orc.id,
    p_kit_id: dados.data.kit_id,
  });
  if (error) return falha(mensagemErroBanco(error));
  atualizar(slug, osId);
  return sucesso({ itens: Number(data ?? 0) });
}

export async function atualizarItemAction(
  slug: string,
  osId: string,
  itemId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = atualizarItemSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(itemId).success) return falha("Item inválido.");
  const ctx = await contexto(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamento_itens")
    .update(dados.data)
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", itemId)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Item não encontrado.");
  atualizar(slug, osId);
  return sucesso();
}

export async function removerItemAction(
  slug: string,
  osId: string,
  itemId: string,
): Promise<ResultadoAcao> {
  if (!idSchema.safeParse(itemId).success) return falha("Item inválido.");
  const ctx = await contexto(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamento_itens")
    .delete()
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", itemId)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Item não encontrado.");
  atualizar(slug, osId);
  return sucesso();
}

export async function atualizarOrcamentoAction(
  slug: string,
  osId: string,
  orcamentoId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = atualizarOrcamentoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!idSchema.safeParse(orcamentoId).success) return falha("Orçamento inválido.");
  const ctx = await contexto(slug, osId);
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const patch: { desconto?: number; validade?: string; observacoes?: string | null } = {};
  if (dados.data.desconto !== undefined) patch.desconto = dados.data.desconto;
  if (dados.data.validade !== undefined) patch.validade = dados.data.validade;
  if (dados.data.observacoes !== undefined) patch.observacoes = dados.data.observacoes;
  const { data, error } = await supabase
    .from("orcamentos")
    .update(patch)
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("id", orcamentoId)
    .eq("status", "rascunho")
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Só é possível editar o rascunho.");
  atualizar(slug, osId);
  return sucesso();
}

/** Dono libera o desconto acima do limite do balcão (desconto_aprovado_por). */
export async function aprovarDescontoAction(
  slug: string,
  osId: string,
  orcamentoId: string,
): Promise<ResultadoAcao> {
  if (!idSchema.safeParse(orcamentoId).success) return falha("Orçamento inválido.");
  const ctx = await contexto(slug, osId, "orcamento.aprovar_desconto");
  if (!ctx) return falha("Só o dono aprova desconto acima do limite.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("orcamentos")
    .update({ desconto_aprovado_por: ctx.membro.id })
    .eq("empresa_id", ctx.empresa.id)
    .eq("os_id", osId)
    .eq("id", orcamentoId)
    .eq("status", "rascunho")
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data || data.length === 0) return falha("Orçamento não encontrado.");
  atualizar(slug, osId);
  return sucesso();
}

export async function enviarOrcamentoAction(
  slug: string,
  osId: string,
  orcamentoId: string,
): Promise<ResultadoAcao<{ link: string; versao: number }>> {
  if (!idSchema.safeParse(orcamentoId).success) return falha("Orçamento inválido.");
  const ctx = await contexto(slug, osId, "orcamento.enviar");
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();

  // Pré-checagem do limite com a mesma regra do banco (mensagem amigável).
  const [{ data: orc }, { data: itens }] = await Promise.all([
    supabase
      .from("orcamentos")
      .select("desconto, desconto_aprovado_por")
      .eq("empresa_id", ctx.empresa.id)
      .eq("id", orcamentoId)
      .maybeSingle(),
    supabase
      .from("orcamento_itens")
      .select("quantidade, preco_unitario, desconto")
      .eq("empresa_id", ctx.empresa.id)
      .eq("orcamento_id", orcamentoId),
  ]);
  if (!orc) return falha("Orçamento não encontrado.");
  const totais = calcularTotais(
    (itens ?? []).map((i) => ({
      quantidade: Number(i.quantidade),
      precoUnitario: Number(i.preco_unitario ?? 0),
      desconto: Number(i.desconto),
    })),
    Number(orc.desconto),
  );
  const aval = avaliarDesconto({
    totais,
    limitePct: ctx.membro.limite_desconto_pct,
    papel: ctx.membro.papel,
    aprovadoPeloDono: orc.desconto_aprovado_por !== null,
  });
  if (aval.bloqueado) return falha(aval.mensagem ?? "Desconto acima do limite.");

  const { data, error } = await supabase.rpc("enviar_orcamento", { p_orcamento_id: orcamentoId });
  if (error) return falha(mensagemErroBanco(error));
  // Modo local: não existe link para o cliente.
  const { data: token } = modoLocal()
    ? { data: null }
    : await supabase.rpc("os_link_publico", { p_os_id: osId });
  atualizar(slug, osId);
  return sucesso({
    versao: data.versao,
    link: token ? linkPublicoOs(SITE_URL, token) : "",
  });
}

/** Balcão registra a resposta do cliente (presencial, telefone ou WhatsApp). */
export async function responderOrcamentoAction(
  slug: string,
  osId: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = respostaPresencialSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contexto(slug, osId, "orcamento.registrar_resposta");
  if (!ctx) return falha("Sem permissão.");
  const orc = await rascunhoDaOs(ctx.empresa.id, osId, dados.data.orcamento_id);
  if (!orc) return falha("Orçamento não encontrado.");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("responder_orcamento", {
    p_orcamento_id: orc.id,
    p_aprovar: dados.data.aprovar,
    p_nome: dados.data.nome,
    p_canal: dados.data.canal,
  });
  if (error) return falha(mensagemErroBanco(error));
  atualizar(slug, osId);
  return sucesso();
}

/** Revoga o link público atual e gera outro. */
export async function regenerarLinkAction(
  slug: string,
  osId: string,
): Promise<ResultadoAcao<{ link: string }>> {
  if (modoLocal()) return falha("Este sistema não usa link público.");
  const ctx = await contexto(slug, osId, "orcamento.enviar");
  if (!ctx) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("regenerar_token_publico", { p_os_id: osId });
  if (error) return falha(mensagemErroBanco(error));
  atualizar(slug, osId);
  return sucesso({ link: linkPublicoOs(SITE_URL, String(data)) });
}
