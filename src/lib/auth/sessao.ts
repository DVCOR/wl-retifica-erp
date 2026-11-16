import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ConfigEmpresa, Papel } from "./permissoes";

export type UsuarioAtual = { id: string; email: string | null };

export type EmpresaResumo = {
  id: string;
  slug: string;
  nome_fantasia: string;
  logo_path: string | null;
  papel: Papel;
};

export type ContextoEmpresa = {
  usuario: UsuarioAtual;
  empresa: {
    id: string;
    slug: string;
    nome_fantasia: string;
    logo_path: string | null;
    config: ConfigEmpresa;
  };
  membro: { id: string; nome: string; papel: Papel; limite_desconto_pct: number };
  /** Todas as empresas do usuário (para a troca de empresa). */
  empresas: EmpresaResumo[];
};

/** Usuário logado (validado no servidor do Supabase Auth) ou null. */
export const obterUsuario = cache(async (): Promise<UsuarioAtual | null> => {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});

/** Usuário logado ou redireciona para /login. */
export async function exigirUsuario(): Promise<UsuarioAtual> {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Empresas em que o usuário é membro ativo (RLS garante o filtro). */
export const listarEmpresasDoUsuario = cache(async (): Promise<EmpresaResumo[]> => {
  const usuario = await obterUsuario();
  if (!usuario) return [];
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("membros")
    .select("papel, empresas!inner(id, slug, nome_fantasia, logo_path, ativo)")
    .eq("user_id", usuario.id)
    .eq("ativo", true)
    .eq("empresas.ativo", true);
  if (error) throw new Error(`Erro ao listar empresas: ${error.message}`);
  return (data ?? [])
    .map((m) => ({
      id: m.empresas.id,
      slug: m.empresas.slug,
      nome_fantasia: m.empresas.nome_fantasia,
      logo_path: m.empresas.logo_path,
      papel: m.papel,
    }))
    .sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia, "pt-BR"));
});

/**
 * Contexto da empresa ativa (slug da URL). Valida no servidor que o usuário é
 * membro ativo; senão 404. Memoizado por requisição (React cache), então
 * layout e páginas podem chamar à vontade.
 */
export const obterContextoEmpresa = cache(async (slug: string): Promise<ContextoEmpresa> => {
  const usuario = await obterUsuario();
  if (!usuario) redirect(`/login?proximo=${encodeURIComponent(`/${slug}/inicio`)}`);

  const supabase = await criarClienteServidor();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, slug, nome_fantasia, logo_path, config")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();
  if (!empresa) notFound();

  const { data: membro } = await supabase
    .from("membros")
    .select("id, nome, papel, limite_desconto_pct")
    .eq("empresa_id", empresa.id)
    .eq("user_id", usuario.id)
    .eq("ativo", true)
    .maybeSingle();
  if (!membro) notFound();

  const empresas = await listarEmpresasDoUsuario();

  return {
    usuario,
    empresa: {
      id: empresa.id,
      slug: empresa.slug,
      nome_fantasia: empresa.nome_fantasia,
      logo_path: empresa.logo_path,
      config: (empresa.config ?? {}) as ConfigEmpresa,
    },
    membro: {
      id: membro.id,
      nome: membro.nome,
      papel: membro.papel,
      limite_desconto_pct: Number(membro.limite_desconto_pct),
    },
    empresas,
  };
});
