"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import {
  alternarAtivoSchema,
  kitSchema,
  pecaSchema,
  precosTabelaSchema,
  servicoSchema,
  tabelaPrecoSchema,
} from "@/lib/validacoes/catalogo";

/**
 * Server Actions do catálogo. Só o dono edita (matriz: catalogo.editar); a RLS
 * garante de novo. `empresa_id` vem sempre da sessão, nunca da entrada.
 */

const idSchema = z.uuid("Registro inválido");

async function contextoEdicao(slug: string) {
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "catalogo.editar")) return null;
  return { empresaId: empresa.id };
}

const SEM_PERMISSAO = "Só o dono altera o catálogo e os preços.";

function erroCodigo(erro: { code?: string; message: string }, rotulo: string): string {
  return erro.code === "23505"
    ? `Já existe ${rotulo} com este código.`
    : mensagemErroBanco({ code: erro.code ?? "", message: erro.message });
}

// ---------------------------------------------------------------- serviços
export async function salvarServico(
  slug: string,
  id: string | null,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = servicoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);

  const supabase = await criarClienteServidor();
  const q = id
    ? supabase.from("servicos").update(dados.data).eq("empresa_id", ctx.empresaId).eq("id", id)
    : supabase.from("servicos").insert({ ...dados.data, empresa_id: ctx.empresaId });
  const { data, error } = await q.select("id");
  if (error) return falha(erroCodigo(error, "um serviço"));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");
  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso({ id: data[0].id });
}

export async function alternarAtivoServico(slug: string, entrada: unknown): Promise<ResultadoAcao> {
  const dados = alternarAtivoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("servicos")
    .update({ ativo: dados.data.ativo })
    .eq("empresa_id", ctx.empresaId)
    .eq("id", dados.data.id)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");
  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso();
}

// ------------------------------------------------------------------- peças
export async function salvarPeca(
  slug: string,
  id: string | null,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = pecaSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);

  const supabase = await criarClienteServidor();
  const q = id
    ? supabase.from("pecas").update(dados.data).eq("empresa_id", ctx.empresaId).eq("id", id)
    : supabase.from("pecas").insert({ ...dados.data, empresa_id: ctx.empresaId });
  const { data, error } = await q.select("id");
  if (error) return falha(erroCodigo(error, "uma peça"));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");
  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso({ id: data[0].id });
}

export async function alternarAtivoPeca(slug: string, entrada: unknown): Promise<ResultadoAcao> {
  const dados = alternarAtivoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("pecas")
    .update({ ativo: dados.data.ativo })
    .eq("empresa_id", ctx.empresaId)
    .eq("id", dados.data.id)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");
  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso();
}

// ------------------------------------------------------- tabelas de preço
export async function salvarTabelaPreco(
  slug: string,
  id: string | null,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = tabelaPrecoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);

  const supabase = await criarClienteServidor();
  const { padrao_para, ...campos } = dados.data;

  // Grava nome/desconto; a escolha de tabela padrão vai pela RPC
  // definir_tabela_padrao, que libera a anterior na mesma transação.
  const q = id
    ? supabase
        .from("tabelas_preco")
        .update(padrao_para ? campos : { ...campos, padrao_para: null })
        .eq("empresa_id", ctx.empresaId)
        .eq("id", id)
    : supabase.from("tabelas_preco").insert({ ...campos, empresa_id: ctx.empresaId });
  const { data, error } = await q.select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");
  const tabelaId = data[0].id;

  if (padrao_para) {
    const { error: erroPadrao } = await supabase.rpc("definir_tabela_padrao", {
      p_tabela_id: tabelaId,
      p_tipo: padrao_para,
    });
    if (erroPadrao) return falha(mensagemErroBanco(erroPadrao));
  }

  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso({ id: tabelaId });
}

export async function alternarAtivoTabelaPreco(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  const dados = alternarAtivoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("tabelas_preco")
    .update({ ativo: dados.data.ativo })
    .eq("empresa_id", ctx.empresaId)
    .eq("id", dados.data.id)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");
  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso();
}

/** Grava só os preços alterados: `preco` nulo remove o preço específico. */
export async function salvarPrecosTabela(
  slug: string,
  tabelaId: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ gravados: number }>> {
  const tabela = idSchema.safeParse(tabelaId);
  if (!tabela.success) return falha("Tabela inválida.");
  const dados = precosTabelaSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);

  // Upsert/remoção numa transação só (RPC salvar_precos_tabela).
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("salvar_precos_tabela", {
    p_tabela_id: tabela.data,
    p_precos: dados.data.itens,
  });
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso({ gravados: data ?? 0 });
}

// -------------------------------------------------------------------- kits
export async function salvarKit(
  slug: string,
  id: string | null,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = kitSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);

  // Cabeçalho + substituição dos itens numa transação só (RPC salvar_kit).
  const supabase = await criarClienteServidor();
  const { itens, ...cabecalho } = dados.data;
  const { data, error } = await supabase.rpc("salvar_kit", {
    // null = criar (o gerador de tipos não marca o uuid como anulável)
    p_kit_id: id as string,
    p_dados: { ...cabecalho, empresa_id: ctx.empresaId },
    p_itens: itens,
  });
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso({ id: data });
}

export async function alternarAtivoKit(slug: string, entrada: unknown): Promise<ResultadoAcao> {
  const dados = alternarAtivoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoEdicao(slug);
  if (!ctx) return falha(SEM_PERMISSAO);
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("kits")
    .update({ ativo: dados.data.ativo })
    .eq("empresa_id", ctx.empresaId)
    .eq("id", dados.data.id)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");
  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso();
}
