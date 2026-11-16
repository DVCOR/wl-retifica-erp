import { z } from "zod";

// ---------------------------------------------------------------------------
// Utilitários (puros, testados em clientes.test.ts)
// ---------------------------------------------------------------------------

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** CPF com dígitos verificadores (rejeita sequências repetidas). */
export function validarCpf(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

/** CNPJ numérico com dígitos verificadores (rejeita sequências repetidas). */
export function validarCnpj(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (base: string) => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i]!;
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(d.slice(0, 12)) === Number(d[12]) && digito(d.slice(0, 13)) === Number(d[13]);
}

export type Pessoa = "pf" | "pj";

/** Valida o documento conforme o tipo de pessoa (vazio é aceito: o campo é opcional). */
export function validarDocumento(valor: string, pessoa: Pessoa): boolean {
  const d = somenteDigitos(valor);
  if (d === "") return true;
  return pessoa === "pf" ? validarCpf(d) : validarCnpj(d);
}

export function mascararCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function mascararCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function mascararDocumento(valor: string, pessoa: Pessoa): string {
  return pessoa === "pf" ? mascararCpf(valor) : mascararCnpj(valor);
}

/** (11) 99999-9999 ou (11) 9999-9999, enquanto digita. */
export function mascararTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascararCep(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Telefone brasileiro com DDD (10 ou 11 dígitos); aceita +55 na frente. */
export function validarTelefone(valor: string): boolean {
  let d = somenteDigitos(valor);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  return d.length === 10 || d[2] === "9";
}

/** Link wa.me (assume Brasil quando não há DDI). */
export function linkWhatsapp(telefone: string | null | undefined, texto?: string): string | null {
  let d = somenteDigitos(telefone);
  if (d.length < 10) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** "1.234,56" / "1234.56" / "R$ 10" -> número, ou null se vazio/ inválido. */
export function parseDecimalBR(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const limpo = valor.replace(/[R$\s]/g, "");
  if (limpo === "") return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : Number.NaN;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const TIPOS_CLIENTE = ["lojista", "final"] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];
export const ROTULO_TIPO_CLIENTE: Record<TipoCliente, string> = {
  lojista: "Lojista",
  final: "Cliente final",
};

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const enderecoSchema = z.object({
  cep: z
    .string()
    .trim()
    .transform(somenteDigitos)
    .refine((v) => v === "" || v.length === 8, "CEP deve ter 8 dígitos")
    .default(""),
  logradouro: z.string().trim().max(160).default(""),
  numero: z.string().trim().max(20).default(""),
  complemento: z.string().trim().max(80).default(""),
  bairro: z.string().trim().max(80).default(""),
  cidade: z.string().trim().max(80).default(""),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || (UFS as readonly string[]).includes(v), "UF inválida")
    .default(""),
});
export type Endereco = z.output<typeof enderecoSchema>;

const whatsappOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? somenteDigitos(v) : ""))
  .refine((v) => v === "" || validarTelefone(v), "Telefone inválido (use DDD + número)")
  .transform((v) => (v === "" ? null : v));

/** Número em texto pt-BR -> number | null (inválido ou negativo vira erro). */
const decimalOpcional = (rotulo: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => parseDecimalBR(v))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), `${rotulo} inválido`)
    .refine((v) => v === null || v <= 9_999_999_999, `${rotulo} muito alto`);

const idOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.uuid().safeParse(v).success, "Seleção inválida");

export const clienteSchema = z
  .object({
    tipo: z.enum(TIPOS_CLIENTE, { error: "Escolha o tipo do cliente" }),
    pessoa: z.enum(["pf", "pj"]).default("pj"),
    nome: z.string().trim().min(2, "Informe o nome").max(160),
    nome_fantasia: texto(160),
    documento: z.string().trim().optional().default(""),
    ie: texto(30),
    telefone_whatsapp: whatsappOpcional,
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toLowerCase() : null))
      .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido"),
    endereco: enderecoSchema.default(() => enderecoSchema.parse({})),
    tabela_preco_id: idOpcional,
    limite_credito: decimalOpcional("Limite"),
    condicao_pagamento: texto(80),
    dia_fechamento: z
      .string()
      .trim()
      .optional()
      .transform((v) => parseDecimalBR(v))
      .refine(
        (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 31),
        "Informe um dia de 1 a 31",
      ),
    observacoes: texto(2000),
    ativo: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (!validarDocumento(v.documento, v.pessoa)) {
      ctx.addIssue({
        code: "custom",
        path: ["documento"],
        message: v.pessoa === "pf" ? "CPF inválido" : "CNPJ inválido",
      });
    }
  })
  .transform((v) => ({
    ...v,
    documento: somenteDigitos(v.documento) || null,
    ie: v.pessoa === "pj" ? v.ie : null,
    nome_fantasia: v.pessoa === "pj" ? v.nome_fantasia : null,
    // fechamento só faz sentido para lojista (faturado)
    dia_fechamento: v.tipo === "lojista" ? v.dia_fechamento : null,
  }));

export type ClienteEntrada = z.input<typeof clienteSchema>;
export type ClienteDados = z.output<typeof clienteSchema>;

/** Cadastro rápido (wizard de Nova OS): só o essencial. */
export const clienteRapidoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(160),
  tipo: z.enum(TIPOS_CLIENTE, { error: "Escolha o tipo do cliente" }),
  telefone_whatsapp: whatsappOpcional,
});
export type ClienteRapidoEntrada = z.input<typeof clienteRapidoSchema>;

export const STATUS_FILTRO_ATIVO = ["todos", "ativos", "inativos"] as const;

/** Parâmetros de URL da lista de clientes. */
export const filtroClientesSchema = z.object({
  q: z.string().trim().max(80).catch("").default(""),
  tipo: z
    .enum(["todos", ...TIPOS_CLIENTE])
    .catch("todos")
    .default("todos"),
  situacao: z.enum(STATUS_FILTRO_ATIVO).catch("ativos").default("ativos"),
  pagina: z.coerce.number().int().min(1).catch(1).default(1),
});
export type FiltroClientes = z.output<typeof filtroClientesSchema>;
