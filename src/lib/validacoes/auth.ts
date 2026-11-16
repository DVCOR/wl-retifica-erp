import { z } from "zod";
import { DOMINIO_LOGIN_INTERNO, modoLocal } from "@/lib/modo";

export const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido");

/** Login simples (modo local): letras minúsculas, números, ponto, hífen e sublinhado. */
export const LOGIN_REGEX = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/**
 * Converte o que a pessoa digitou (e-mail ou só o "login") no e-mail do
 * Supabase Auth. Sem "@" vira `<login>@wl.local`. Devolve null se inválido.
 */
export function normalizarAcesso(valor: string): string | null {
  const v = valor.trim().toLowerCase();
  if (!v) return null;
  if (v.includes("@")) return emailSchema.safeParse(v).success ? v : null;
  return LOGIN_REGEX.test(v) ? `${v}@${DOMINIO_LOGIN_INTERNO}` : null;
}

/** Mostra só o login quando o e-mail é interno (`balcao1@wl.local` -> `balcao1`). */
export function acessoParaExibir(email: string | null | undefined): string {
  if (!email) return "";
  const sufixo = `@${DOMINIO_LOGIN_INTERNO}`;
  return email.endsWith(sufixo) ? email.slice(0, -sufixo.length) : email;
}

/**
 * Campo de entrada do login: no modo local aceita só o login (sem "@"); na
 * nuvem exige e-mail.
 */
const acessoLoginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe seu e-mail")
  .transform((v, ctx) => {
    if (modoLocal()) {
      const email = normalizarAcesso(v);
      if (!email) {
        ctx.addIssue({ code: "custom", message: "Informe seu e-mail ou login" });
        return z.NEVER;
      }
      return email;
    }
    if (!emailSchema.safeParse(v).success) {
      ctx.addIssue({ code: "custom", message: "Informe um e-mail válido" });
      return z.NEVER;
    }
    return v;
  });

export const loginSenhaSchema = z.object({
  email: acessoLoginSchema,
  senha: z.string().min(6, "A senha tem ao menos 6 caracteres"),
  proximo: z.string().optional(),
});

export const loginLinkSchema = z.object({
  email: emailSchema,
  proximo: z.string().optional(),
});

export const aceitarConviteSchema = z.object({
  token: z.string().uuid("Convite inválido"),
  nome: z.string().trim().max(80).optional(),
});
