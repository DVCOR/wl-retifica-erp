import { z } from "zod";

const MAX_VALOR = 9_999_999.99;

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const moeda = (rotulo: string) =>
  z
    .number({ error: `Informe ${rotulo}` })
    .min(0, "O valor não pode ser negativo")
    .max(MAX_VALOR, "Valor alto demais");

const moedaOpcional = z
  .number()
  .min(0, "O valor não pode ser negativo")
  .max(MAX_VALOR, "Valor alto demais")
  .nullable();

export const servicoSchema = z.object({
  codigo: textoOpcional(40),
  nome: z.string().trim().min(2, "Informe o nome do serviço").max(120, "Use até 120 caracteres"),
  categoria: textoOpcional(60),
  unidade: z.enum(["un", "cilindro", "valvula", "hora"], { error: "Escolha a unidade" }),
  preco_base: moeda("o preço base"),
  tempo_padrao_min: z
    .number({ error: "Informe um número inteiro" })
    .int("Informe um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(100_000, "Valor alto demais")
    .nullable(),
});
export type ServicoForm = z.input<typeof servicoSchema>;

export const pecaSchema = z.object({
  codigo: textoOpcional(40),
  descricao: z
    .string()
    .trim()
    .min(2, "Informe a descrição da peça")
    .max(160, "Use até 160 caracteres"),
  marca: textoOpcional(60),
  unidade: z.string().trim().min(1, "Informe a unidade").max(10, "Use até 10 caracteres"),
  custo: moedaOpcional,
  preco_venda: moeda("o preço de venda"),
});
export type PecaForm = z.input<typeof pecaSchema>;

export const tabelaPrecoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da tabela").max(80, "Use até 80 caracteres"),
  desconto_padrao_pct: z
    .number({ error: "Informe o desconto" })
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
  padrao_para: z.enum(["lojista", "final"]).nullable(),
});
export type TabelaPrecoForm = z.input<typeof tabelaPrecoSchema>;

export const precosTabelaSchema = z.object({
  /** preco null = remover o preço específico (volta ao desconto da tabela). */
  itens: z
    .array(
      z.object({
        tipo: z.enum(["servico", "peca"]),
        id: z.uuid("Item inválido"),
        preco: moedaOpcional,
      }),
    )
    .max(2000, "Itens demais de uma vez"),
});
export type PrecosTabelaForm = z.input<typeof precosTabelaSchema>;

export const kitSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do kit").max(120, "Use até 120 caracteres"),
  descricao: textoOpcional(300),
  itens: z
    .array(
      z.object({
        tipo: z.enum(["servico", "peca"]),
        id: z.uuid("Item inválido"),
        quantidade: z
          .number({ error: "Informe a quantidade" })
          .gt(0, "A quantidade deve ser maior que zero")
          .max(99_999, "Quantidade alta demais"),
      }),
    )
    .min(1, "Adicione ao menos um item ao kit")
    .max(100, "Kit com itens demais")
    .refine(
      (itens) => new Set(itens.map((i) => `${i.tipo}:${i.id}`)).size === itens.length,
      "Há itens repetidos no kit",
    ),
});
export type KitForm = z.input<typeof kitSchema>;

export const alternarAtivoSchema = z.object({
  id: z.uuid("Registro inválido"),
  ativo: z.boolean(),
});
