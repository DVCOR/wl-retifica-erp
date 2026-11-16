"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { dadosEmpresaSchema } from "@/lib/validacoes/empresa";

/**
 * Exemplo do padrão de Server Action (ver src/lib/data/README.md):
 * 1) valida a entrada com zod  2) confere o papel (UX; a RLS garante de novo)
 * 3) grava com o cliente do usuário  4) revalidatePath  5) devolve ResultadoAcao.
 */
export async function atualizarDadosEmpresa(slug: string, entrada: unknown): Promise<ResultadoAcao> {
  const dados = dadosEmpresaSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "configuracoes.gerenciar")) {
    return falha("Só o dono altera os dados da empresa.");
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("empresas")
    .update(dados.data)
    .eq("id", empresa.id)
    .select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Você não tem permissão para esta ação.");

  revalidatePath(`/${slug}`, "layout");
  return sucesso();
}
