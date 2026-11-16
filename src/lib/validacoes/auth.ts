import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido");

export const loginSenhaSchema = z.object({
  email: emailSchema,
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
