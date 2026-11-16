import { z } from "zod";

/** Texto opcional: aparado; vazio vira undefined. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : undefined));

const apenasDigitos = (v: string) => v.replace(/\D/g, "");

const telefoneOpcional = z
  .string()
  .optional()
  .transform((v) => (v ? apenasDigitos(v) : undefined))
  .refine((v) => v === undefined || v === "" || v.length === 10 || v.length === 11, {
    message: "Telefone com DDD (10 ou 11 dígitos)",
  })
  .transform((v) => (v ? v : undefined));

const documentoOpcional = z
  .string()
  .optional()
  .transform((v) => (v ? apenasDigitos(v) : undefined))
  .refine((v) => v === undefined || v === "" || v.length === 11 || v.length === 14, {
    message: "CPF (11) ou CNPJ (14 dígitos)",
  })
  .transform((v) => (v ? v : undefined));

/** Placa Mercosul (ABC1D23) ou antiga (ABC1234), sem hífen. */
export const PLACA_REGEX = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

export function normalizarPlaca(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const placaOpcional = z
  .string()
  .optional()
  .transform((v) => (v ? normalizarPlaca(v) : undefined))
  .refine((v) => v === undefined || v === "" || PLACA_REGEX.test(v), {
    message: "Placa inválida (ex.: ABC1D23 ou ABC-1234)",
  })
  .transform((v) => (v ? v : undefined));

const uuid = z.string().uuid("Identificador inválido");

export const buscaClienteSchema = z.object({
  termo: z.string().trim().min(2, "Digite ao menos 2 letras").max(80),
});

export const clienteRapidoSchema = z.object({
  tipo: z.enum(["lojista", "final"], { message: "Escolha o tipo de cliente" }),
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  telefone_whatsapp: telefoneOpcional,
  documento: documentoOpcional,
});
export type ClienteRapidoEntrada = z.input<typeof clienteRapidoSchema>;

export const COMBUSTIVEIS = ["gasolina", "etanol", "flex", "diesel", "gnv"] as const;

const inteiroOpcional = (min: number, max: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : Number(v)))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= min && v <= max), {
      message: `Número entre ${min} e ${max}`,
    });

export const motorRapidoSchema = z
  .object({
    cliente_id: uuid,
    marca: textoOpcional(60),
    modelo: textoOpcional(60),
    codigo_motor: textoOpcional(40),
    numero_serie: textoOpcional(60),
    combustivel: z
      .enum(COMBUSTIVEIS)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    cilindros: inteiroOpcional(1, 16),
    cilindrada: textoOpcional(20),
    valvulas_por_cilindro: inteiroOpcional(1, 6),
    veiculo_placa: placaOpcional,
  })
  .refine((m) => Boolean(m.marca || m.modelo || m.codigo_motor || m.numero_serie), {
    message: "Informe ao menos marca, modelo, código ou série do motor",
    path: ["modelo"],
  });
export type MotorRapidoEntrada = z.input<typeof motorRapidoSchema>;

const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00`)), "Data inválida");

export const novaOsSchema = z.object({
  cliente_id: uuid,
  motor_id: uuid.optional().or(z.literal("").transform(() => undefined)),
  prazo_prometido: dataIso.optional().or(z.literal("").transform(() => undefined)),
  observacoes: textoOpcional(1000),
  cliente_final_nome: textoOpcional(120),
  cliente_final_placa: placaOpcional,
  cliente_final_telefone: telefoneOpcional,
});
export type NovaOsEntrada = z.input<typeof novaOsSchema>;

export const STATUS_ITEM = ["ok", "danificado", "ausente", "na"] as const;

export const atualizarItemSchema = z
  .object({
    status: z.enum(STATUS_ITEM).optional(),
    quantidade: z.number().min(0, "Quantidade inválida").max(9999).nullable().optional(),
    observacao: z.string().trim().max(500, "Use no máximo 500 caracteres").nullable().optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.quantidade !== undefined || v.observacao !== undefined,
    {
      message: "Nada para atualizar",
    },
  );
export type AtualizarItemEntrada = z.input<typeof atualizarItemSchema>;

export const marcarGrupoSchema = z.object({
  grupo: z.string().trim().min(1).max(120),
  status: z.enum(["na", "ok"]),
});

export const registrarAnexoSchema = z.object({
  caminho: z.string().min(10).max(300),
  checklist_item_id: uuid.nullable().optional(),
});

/** Documento de quem entrega o motor: CPF/CNPJ ou RG (letras e números). */
export const assinaturaSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo").max(120),
  documento: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^0-9A-Za-z]/g, ""))
    .refine((v) => v.length >= 5 && v.length <= 20, "Informe o CPF, CNPJ ou RG"),
  caminho_imagem: z.string().min(10).max(300),
});
export type AssinaturaEntrada = z.input<typeof assinaturaSchema>;

export const FOTOS_GERAIS_MINIMO = 3;
