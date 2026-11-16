"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { clienteRapidoSchema, clienteSchema, type ClienteDados } from "@/lib/validacoes/clientes";
import { buscarClientes, type ClienteResumoBusca } from "@/lib/data/clientes";

export type ClienteCriado = {
  id: string;
  nome: string;
  tipo: "lojista" | "final";
  telefone_whatsapp: string | null;
  documento: string | null;
};

function erroCliente(erro: { code: string; message: string }): string {
  if (erro.code === "23505") return "Já existe um cliente ativo com este documento.";
  return mensagemErroBanco(erro);
}

function colunas(d: ClienteDados) {
  return {
    tipo: d.tipo,
    nome: d.nome,
    nome_fantasia: d.nome_fantasia,
    documento: d.documento,
    ie: d.ie,
    telefone_whatsapp: d.telefone_whatsapp,
    email: d.email,
    endereco: d.endereco,
    tabela_preco_id: d.tabela_preco_id,
    limite_credito: d.limite_credito,
    condicao_pagamento: d.condicao_pagamento,
    dia_fechamento: d.dia_fechamento,
    observacoes: d.observacoes,
  };
}

export async function criarCliente(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao<ClienteCriado>> {
  const dados = clienteSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "clientes.cadastrar")) return falha("Você não pode cadastrar clientes.");

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...colunas(dados.data), ativo: true, empresa_id: empresa.id })
    .select("id, nome, tipo, telefone_whatsapp, documento")
    .single();
  if (error) return falha(erroCliente(error));

  revalidatePath(`/${slug}/clientes`);
  return sucesso(data);
}

/** Cadastro rápido (nome, tipo, WhatsApp) usado pelo wizard de Nova OS. */
export async function criarClienteRapido(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao<ClienteCriado>> {
  const dados = clienteRapidoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "clientes.cadastrar")) return falha("Você não pode cadastrar clientes.");

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...dados.data, empresa_id: empresa.id })
    .select("id, nome, tipo, telefone_whatsapp, documento")
    .single();
  if (error) return falha(erroCliente(error));

  revalidatePath(`/${slug}/clientes`);
  return sucesso(data);
}

export async function atualizarCliente(
  slug: string,
  id: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  if (!z.uuid().safeParse(id).success) return falha("Cliente inválido.");
  const dados = clienteSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const { empresa, membro } = await obterContextoEmpresa(slug);
  const completo = pode(membro.papel, "clientes.editar");
  if (!completo && !pode(membro.papel, "clientes.editar_financeiro")) {
    return falha("Você não pode editar clientes.");
  }

  const todas = { ...colunas(dados.data), ativo: dados.data.ativo };
  // O financeiro só altera dados financeiros (o banco também barra).
  const alteracao = completo
    ? todas
    : {
        tabela_preco_id: todas.tabela_preco_id,
        limite_credito: todas.limite_credito,
        condicao_pagamento: todas.condicao_pagamento,
        dia_fechamento: todas.dia_fechamento,
      };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .update(alteracao)
    .eq("empresa_id", empresa.id)
    .eq("id", id)
    .select("id");
  if (error) return falha(erroCliente(error));
  if (!data?.length) return falha("Cliente não encontrado ou sem permissão.");

  revalidatePath(`/${slug}/clientes`);
  revalidatePath(`/${slug}/clientes/${id}`);
  return sucesso();
}

export async function alterarSituacaoCliente(
  slug: string,
  id: string,
  ativo: boolean,
): Promise<ResultadoAcao> {
  if (!z.uuid().safeParse(id).success) return falha("Cliente inválido.");
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "clientes.editar")) return falha("Você não pode editar clientes.");

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .update({ ativo })
    .eq("empresa_id", empresa.id)
    .eq("id", id)
    .select("id");
  if (error) return falha(erroCliente(error));
  if (!data?.length) return falha("Cliente não encontrado ou sem permissão.");

  revalidatePath(`/${slug}/clientes`);
  revalidatePath(`/${slug}/clientes/${id}`);
  return sucesso();
}

const buscaSchema = z.string().trim().max(80);

/** Busca para o seletor de cliente (client components). */
export async function buscarClientesAcao(
  slug: string,
  termo: unknown,
): Promise<ResultadoAcao<ClienteResumoBusca[]>> {
  const t = buscaSchema.safeParse(termo);
  if (!t.success) return falha("Busca inválida.");
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "clientes.ver")) return falha("Você não pode ver clientes.");
  try {
    return sucesso(await buscarClientes(empresa.id, t.data));
  } catch {
    return falha("Não foi possível buscar clientes.");
  }
}
