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

  // Só uma tabela ativa pode ser a padrão de cada tipo de cliente (índice único):
  // a nova escolha substitui a anterior.
  if (dados.data.padrao_para) {
    let libera = supabase
      .from("tabelas_preco")
      .update({ padrao_para: null })
      .eq("empresa_id", ctx.empresaId)
      .eq("padrao_para", dados.data.padrao_para);
    if (id) libera = libera.neq("id", id);
    const { error } = await libera;
    if (error) return falha(mensagemErroBanco(error));
  }

  const q = id
    ? supabase.from("tabelas_preco").update(dados.data).eq("empresa_id", ctx.empresaId).eq("id", id)
    : supabase.from("tabelas_preco").insert({ ...dados.data, empresa_id: ctx.empresaId });
  const { data, error } = await q.select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");
  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso({ id: data[0].id });
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

  const supabase = await criarClienteServidor();
  const { data: existentes, error: erroLer } = await supabase
    .from("tabela_preco_itens")
    .select("id, servico_id, peca_id")
    .eq("empresa_id", ctx.empresaId)
    .eq("tabela_preco_id", tabela.data);
  if (erroLer) return falha(mensagemErroBanco(erroLer));

  const idExistente = new Map<string, string>();
  for (const e of existentes ?? []) {
    if (e.servico_id) idExistente.set(`servico:${e.servico_id}`, e.id);
    if (e.peca_id) idExistente.set(`peca:${e.peca_id}`, e.id);
  }

  const remover: string[] = [];
  const novos: {
    empresa_id: string;
    tabela_preco_id: string;
    servico_id?: string;
    peca_id?: string;
    preco: number;
  }[] = [];
  const atualizar: { id: string; preco: number }[] = [];

  for (const item of dados.data.itens) {
    const existente = idExistente.get(`${item.tipo}:${item.id}`);
    if (item.preco === null) {
      if (existente) remover.push(existente);
    } else if (existente) {
      atualizar.push({ id: existente, preco: item.preco });
    } else {
      novos.push({
        empresa_id: ctx.empresaId,
        tabela_preco_id: tabela.data,
        ...(item.tipo === "servico" ? { servico_id: item.id } : { peca_id: item.id }),
        preco: item.preco,
      });
    }
  }

  if (remover.length) {
    const { error } = await supabase
      .from("tabela_preco_itens")
      .delete()
      .eq("empresa_id", ctx.empresaId)
      .in("id", remover);
    if (error) return falha(mensagemErroBanco(error));
  }
  if (novos.length) {
    const { error } = await supabase.from("tabela_preco_itens").insert(novos);
    if (error) return falha(mensagemErroBanco(error));
  }
  for (const a of atualizar) {
    const { error } = await supabase
      .from("tabela_preco_itens")
      .update({ preco: a.preco })
      .eq("empresa_id", ctx.empresaId)
      .eq("id", a.id);
    if (error) return falha(mensagemErroBanco(error));
  }

  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso({ gravados: remover.length + novos.length + atualizar.length });
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

  const supabase = await criarClienteServidor();
  const { itens, ...cabecalho } = dados.data;

  let kitId = id;
  if (kitId) {
    const { data, error } = await supabase
      .from("kits")
      .update(cabecalho)
      .eq("empresa_id", ctx.empresaId)
      .eq("id", kitId)
      .select("id");
    if (error) return falha(mensagemErroBanco(error));
    if (!data?.length) return falha("Você não tem permissão para esta ação.");
  } else {
    const { data, error } = await supabase
      .from("kits")
      .insert({ ...cabecalho, empresa_id: ctx.empresaId })
      .select("id")
      .single();
    if (error) return falha(mensagemErroBanco(error));
    kitId = data.id;
  }

  // Insere os novos itens antes de apagar os antigos: se algo falhar, o kit não fica vazio.
  const { data: antigos, error: erroAntigos } = await supabase
    .from("kit_itens")
    .select("id")
    .eq("empresa_id", ctx.empresaId)
    .eq("kit_id", kitId);
  if (erroAntigos) return falha(mensagemErroBanco(erroAntigos));

  const { error: erroInserir } = await supabase.from("kit_itens").insert(
    itens.map((item, ordem) => ({
      empresa_id: ctx.empresaId,
      kit_id: kitId,
      ...(item.tipo === "servico" ? { servico_id: item.id } : { peca_id: item.id }),
      quantidade: item.quantidade,
      ordem,
    })),
  );
  if (erroInserir) return falha(mensagemErroBanco(erroInserir));

  if (antigos?.length) {
    const { error } = await supabase
      .from("kit_itens")
      .delete()
      .eq("empresa_id", ctx.empresaId)
      .in(
        "id",
        antigos.map((a) => a.id),
      );
    if (error) return falha(mensagemErroBanco(error));
  }

  revalidatePath(`/${slug}/catalogo`, "layout");
  return sucesso({ id: kitId });
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
