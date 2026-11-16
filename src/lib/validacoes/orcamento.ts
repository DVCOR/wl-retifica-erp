import { z } from "zod";

const uuid = z.string().uuid();
const dinheiro = z.number().finite().min(0).max(9_999_999.99);
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const CANAIS_RESPOSTA = ["presencial", "telefone", "whatsapp"] as const;
export const ROTULO_CANAL: Record<(typeof CANAIS_RESPOSTA)[number] | "link", string> = {
  presencial: "Presencial",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  link: "Link público",
};

export const adicionarItemSchema = z.object({
  orcamento_id: uuid,
  tipo: z.enum(["servico", "peca"]),
  item_id: uuid,
  descricao: z.string().trim().min(1).max(200),
});
export type AdicionarItemEntrada = z.input<typeof adicionarItemSchema>;

export const adicionarKitSchema = z.object({ orcamento_id: uuid, kit_id: uuid });

export const atualizarItemSchema = z.object({
  quantidade: z.number().finite().gt(0).max(99999).optional(),
  preco_unitario: dinheiro.optional(),
  desconto: dinheiro.optional(),
  descricao: z.string().trim().min(1).max(200).optional(),
});
export type AtualizarItemEntrada = z.input<typeof atualizarItemSchema>;

export const atualizarOrcamentoSchema = z.object({
  desconto: dinheiro.optional(),
  validade: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .optional(),
  observacoes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
});
export type AtualizarOrcamentoEntrada = z.input<typeof atualizarOrcamentoSchema>;

export const respostaPresencialSchema = z.object({
  orcamento_id: uuid,
  aprovar: z.boolean(),
  nome: z.string().trim().min(2, "Informe o nome de quem respondeu").max(120),
  canal: z.enum(CANAIS_RESPOSTA),
});
export type RespostaPresencialEntrada = z.input<typeof respostaPresencialSchema>;

export const respostaPublicaSchema = z.object({
  aprovar: z.boolean(),
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
});
export type RespostaPublicaEntrada = z.input<typeof respostaPublicaSchema>;

export const sugerirItemSchema = z.object({
  medicao_id: uuid.nullable().optional(),
  tipo: z.enum(["servico", "peca"]),
  item_id: uuid,
  descricao: z.string().trim().min(1).max(200),
  quantidade: z.number().finite().gt(0).max(9999),
});
export type SugerirItemEntrada = z.input<typeof sugerirItemSchema>;

const numeroOpcional = z.number().finite().nullable().optional();

export const medicaoSchema = z
  .object({
    componente: z.string().trim().min(2, "Informe o componente").max(80),
    descricao: z.string().trim().min(2, "Descreva a medição").max(160),
    tipo: z.enum(["numerica", "teste"]),
    valor: numeroOpcional,
    unidade: textoOpcional(12),
    minimo: numeroOpcional,
    maximo: numeroOpcional,
    /** Testes aprovado/reprovado. */
    aprovado: z.boolean().nullable().optional(),
    observacao: textoOpcional(500),
  })
  .superRefine((m, ctx) => {
    if (m.tipo === "numerica") {
      if (m.valor === null || m.valor === undefined) {
        ctx.addIssue({ code: "custom", path: ["valor"], message: "Informe o valor medido" });
      }
      if (
        m.minimo !== null &&
        m.minimo !== undefined &&
        m.maximo !== null &&
        m.maximo !== undefined &&
        m.minimo > m.maximo
      ) {
        ctx.addIssue({ code: "custom", path: ["minimo"], message: "Mínimo maior que o máximo" });
      }
    } else if (m.aprovado === null || m.aprovado === undefined) {
      ctx.addIssue({ code: "custom", path: ["aprovado"], message: "Marque aprovado ou reprovado" });
    }
  });
export type MedicaoEntrada = z.input<typeof medicaoSchema>;

export const anexoMedicaoSchema = z.object({
  medicao_id: uuid,
  caminho: z.string().min(10).max(300),
});
