import { z } from "zod";

export const osStatusEnum = z.enum([
  "em_recebimento",
  "recebido",
  "em_analise",
  "orcamento_enviado",
  "aprovado",
  "reprovado",
  "em_execucao",
  "aguardando_peca",
  "pronto",
  "entregue",
  "cancelado",
]);

export const alterarStatusSchema = z.object({
  status: osStatusEnum,
  motivo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
});

export const cancelarSchema = z.object({
  motivo: z.string().trim().min(3, "Informe o motivo do cancelamento").max(500),
});

export const trocarTecnicoSchema = z.object({
  tecnico_id: z.string().uuid().nullable(),
});

export const iniciarApontamentoSchema = z.object({
  orcamento_item_id: z.string().uuid().nullable().optional(),
  observacao: z.string().trim().max(300).optional(),
});

export const itemConcluidoSchema = z.object({
  orcamento_item_id: z.string().uuid(),
  concluido: z.boolean(),
});

export const entregaSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome de quem retira").max(120),
  documento: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^0-9A-Za-z]/g, ""))
    .refine((v) => v.length >= 5 && v.length <= 20, "Informe o CPF, CNPJ ou RG"),
  caminho_imagem: z.string().min(10).max(300),
  garantia_dias: z.coerce.number().int().min(0, "Mínimo 0").max(3650, "Máximo 3650"),
});
export type EntregaEntrada = z.input<typeof entregaSchema>;

export const fotoExecucaoSchema = z.object({
  caminho: z.string().min(10).max(300),
  legenda: z.string().trim().max(200).optional(),
});

export const garantiaOsSchema = z.object({
  observacoes: z.string().trim().max(500).optional(),
});
