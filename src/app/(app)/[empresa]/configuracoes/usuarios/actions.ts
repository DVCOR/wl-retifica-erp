"use server";

import { revalidatePath } from "next/cache";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { modoLocal } from "@/lib/modo";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  alterarAtivoSchema,
  criarUsuarioSchema,
  mudarPapelSchema,
  redefinirSenhaSchema,
  validarAlteracaoMembro,
} from "@/lib/validacoes/usuarios";

/**
 * Gestão de usuários pelo dono. Criar usuário e redefinir senha usam a API
 * admin do GoTrue (service role, só aqui no servidor) e existem só no modo
 * local; mudar papel e ativar/desativar passam pela RLS (dono) em qualquer modo.
 */

async function contextoDono(slug: string) {
  const ctx = await obterContextoEmpresa(slug);
  return pode(ctx.membro.papel, "usuarios.gerenciar") ? ctx : null;
}

function atualizar(slug: string) {
  revalidatePath(`/${slug}/configuracoes/usuarios`);
  revalidatePath(`/${slug}/configuracoes`);
}

function mensagemAdmin(erro: { code?: string; message?: string; status?: number }): string {
  if (erro.code === "email_exists" || erro.code === "user_already_exists") {
    return "Já existe um usuário com este e-mail ou login.";
  }
  if (erro.code === "weak_password") return "Senha fraca demais. Use uma senha maior.";
  if (erro.status === 0 || /fetch failed|ECONNREFUSED/i.test(erro.message ?? "")) {
    return "Não foi possível falar com o servidor de acesso. Tente de novo.";
  }
  return "Não foi possível concluir. Tente de novo.";
}

export async function criarUsuarioAction(slug: string, entrada: unknown): Promise<ResultadoAcao> {
  if (!modoLocal()) return falha("Neste ambiente os usuários entram por convite.");
  const dados = criarUsuarioSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoDono(slug);
  if (!ctx) return falha("Só o dono gerencia usuários.");

  const admin = criarClienteAdmin();
  const { data: criado, error } = await admin.auth.admin.createUser({
    email: dados.data.acesso,
    password: dados.data.senha,
    email_confirm: true,
    user_metadata: { nome: dados.data.nome },
  });
  if (error || !criado.user) return falha(mensagemAdmin(error ?? {}));

  // Vincula à empresa com a sessão do dono (a função exige dono).
  const supabase = await criarClienteServidor();
  const { error: erroMembro } = await supabase.rpc("adicionar_membro", {
    p_empresa_id: ctx.empresa.id,
    p_user_id: criado.user.id,
    p_nome: dados.data.nome,
    p_papel: dados.data.papel,
  });
  if (erroMembro) {
    // não deixa conta órfã no Auth
    await admin.auth.admin.deleteUser(criado.user.id).catch(() => undefined);
    return falha(mensagemErroBanco(erroMembro));
  }

  atualizar(slug);
  return sucesso();
}

export async function redefinirSenhaAction(slug: string, entrada: unknown): Promise<ResultadoAcao> {
  if (!modoLocal()) return falha("Neste ambiente a senha é redefinida por e-mail.");
  const dados = redefinirSenhaSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await contextoDono(slug);
  if (!ctx) return falha("Só o dono gerencia usuários.");

  // O membro precisa ser DESTA empresa (a RLS do dono só mostra os dele).
  const supabase = await criarClienteServidor();
  const { data: alvo } = await supabase
    .from("membros")
    .select("user_id")
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", dados.data.membro_id)
    .maybeSingle();
  if (!alvo) return falha("Usuário não encontrado.");

  const { error } = await criarClienteAdmin().auth.admin.updateUserById(alvo.user_id, {
    password: dados.data.senha,
  });
  if (error) return falha(mensagemAdmin(error));
  return sucesso();
}

async function alterarMembro(
  slug: string,
  membroId: string,
  mudanca: { papel?: "dono" | "balcao" | "tecnico" | "financeiro"; ativo?: boolean },
): Promise<ResultadoAcao> {
  const ctx = await contextoDono(slug);
  if (!ctx) return falha("Só o dono gerencia usuários.");
  const supabase = await criarClienteServidor();

  const { data: membros, error } = await supabase
    .from("membros")
    .select("id, papel, ativo")
    .eq("empresa_id", ctx.empresa.id);
  if (error) return falha(mensagemErroBanco(error));
  const alvo = membros?.find((m) => m.id === membroId);
  if (!alvo) return falha("Usuário não encontrado.");

  const bloqueio = validarAlteracaoMembro({
    alvoId: alvo.id,
    euId: ctx.membro.id,
    papelAtualAlvo: alvo.papel,
    alvoAtivo: alvo.ativo,
    novoPapel: mudanca.papel,
    novoAtivo: mudanca.ativo,
    donosAtivos: (membros ?? []).filter((m) => m.papel === "dono" && m.ativo).length,
  });
  if (bloqueio) return falha(bloqueio);

  const { data, error: erroUpdate } = await supabase
    .from("membros")
    .update(mudanca)
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", membroId)
    .select("id");
  if (erroUpdate) return falha(mensagemErroBanco(erroUpdate));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");

  atualizar(slug);
  return sucesso();
}

export async function mudarPapelAction(slug: string, entrada: unknown): Promise<ResultadoAcao> {
  const dados = mudarPapelSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  return alterarMembro(slug, dados.data.membro_id, { papel: dados.data.papel });
}

export async function alterarAtivoAction(slug: string, entrada: unknown): Promise<ResultadoAcao> {
  const dados = alterarAtivoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  return alterarMembro(slug, dados.data.membro_id, { ativo: dados.data.ativo });
}
