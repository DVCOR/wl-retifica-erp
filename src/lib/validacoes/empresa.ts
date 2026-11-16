import { z } from "zod";

const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const dadosEmpresaSchema = z.object({
  nome_fantasia: z.string().trim().min(2, "Informe o nome fantasia").max(120),
  razao_social: opcional,
  telefone: opcional,
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || z.string().email().safeParse(v).success, "E-mail inválido"),
});

export type DadosEmpresa = z.input<typeof dadosEmpresaSchema>;
