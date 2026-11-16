import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";

/**
 * Retorno padrão das Server Actions (ver src/lib/data/README.md).
 * Nunca lance erro para o cliente: devolva { ok: false, erro }.
 */
export type ResultadoAcao<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campos?: Record<string, string[] | undefined> };

export function sucesso(): ResultadoAcao<undefined>;
export function sucesso<T>(dados: T): ResultadoAcao<T>;
export function sucesso<T>(dados?: T): ResultadoAcao<T | undefined> {
  return { ok: true, dados };
}

export function falha(
  erro: string,
  campos?: Record<string, string[] | undefined>,
): { ok: false; erro: string; campos?: Record<string, string[] | undefined> } {
  return { ok: false, erro, campos };
}

/** Erros de validação do zod -> falha com erros por campo. */
export function falhaValidacao(erro: ZodError) {
  const campos: Record<string, string[]> = {};
  for (const issue of erro.issues) {
    const chave = issue.path.join(".") || "_";
    (campos[chave] ??= []).push(issue.message);
  }
  return falha("Confira os campos destacados.", campos);
}

/**
 * Traduz erro do Postgres/Supabase para mensagem em pt-BR. As funções do banco
 * já levantam mensagens em português com errcode P0001 (regra de negócio).
 */
export function mensagemErroBanco(
  erro: Pick<PostgrestError, "code" | "message"> | null | undefined,
): string {
  if (!erro) return "Erro inesperado.";
  switch (erro.code) {
    case "P0001":
      return erro.message;
    case "P0002":
      return erro.message || "Registro não encontrado.";
    case "42501":
      return erro.message && !erro.message.startsWith("new row violates")
        ? erro.message
        : "Você não tem permissão para esta ação.";
    case "23505":
      return "Já existe um registro com estes dados.";
    case "23503":
      return "Registro vinculado a outro dado; não é possível concluir.";
    case "23514":
      return "Algum valor está fora do permitido.";
    default:
      return "Não foi possível concluir. Tente de novo.";
  }
}
