import { z } from "zod";

/** Remove tudo que não é letra/número e põe em maiúsculas (igual ao trigger do banco). */
export function normalizarPlaca(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const PLACA_ANTIGA = /^[A-Z]{3}\d{4}$/;
const PLACA_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

/** Placa antiga (ABC-1234) ou Mercosul (ABC1D23). */
export function validarPlaca(valor: string): boolean {
  const p = normalizarPlaca(valor);
  return PLACA_ANTIGA.test(p) || PLACA_MERCOSUL.test(p);
}

/** Máscara enquanto digita: ABC-1234 (antiga) ou ABC1D23 (Mercosul). */
export function mascararPlaca(valor: string): string {
  const p = normalizarPlaca(valor).slice(0, 7);
  // A 5ª posição decide: dígito = antiga (com hífen), letra = Mercosul
  if (p.length > 3 && /^[A-Z]{3}\d$/.test(p.slice(0, 4)) && (p.length < 5 || /\d/.test(p[4]!))) {
    return `${p.slice(0, 3)}-${p.slice(3)}`;
  }
  return p;
}

export const COMBUSTIVEIS = ["gasolina", "etanol", "flex", "diesel", "gnv"] as const;
export type Combustivel = (typeof COMBUSTIVEIS)[number];
export const ROTULO_COMBUSTIVEL: Record<Combustivel, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  flex: "Flex",
  diesel: "Diesel",
  gnv: "GNV",
};

const textoOpc = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : null));

const inteiroOpc = (rotulo: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v >= min && v <= max),
      `${rotulo}: informe de ${min} a ${max}`,
    );

export const motorSchema = z
  .object({
    cliente_id: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || z.uuid().safeParse(v).success, "Cliente inválido"),
    marca: textoOpc(60),
    modelo: textoOpc(80),
    codigo_motor: textoOpc(40),
    numero_serie: textoOpc(60),
    combustivel: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .refine(
        (v) => v === null || (COMBUSTIVEIS as readonly string[]).includes(v),
        "Combustível inválido",
      )
      .transform((v) => v as Combustivel | null),
    cilindros: inteiroOpc("Cilindros", 1, 16),
    cilindrada: textoOpc(20),
    valvulas_por_cilindro: inteiroOpc("Válvulas", 1, 6),
    veiculo_placa: z
      .string()
      .trim()
      .optional()
      .transform((v) => normalizarPlaca(v))
      .refine((v) => v === "" || validarPlaca(v), "Placa inválida (ABC-1234 ou ABC1D23)")
      .transform((v) => (v === "" ? null : v)),
    veiculo_modelo: textoOpc(80),
    veiculo_ano: inteiroOpc("Ano", 1900, 2100),
    observacoes: textoOpc(2000),
  })
  .refine((v) => Boolean(v.marca || v.modelo || v.codigo_motor || v.numero_serie), {
    path: ["modelo"],
    message: "Informe ao menos marca, modelo, código ou nº de série",
  });

export type MotorEntrada = z.input<typeof motorSchema>;
export type MotorDados = z.output<typeof motorSchema>;

export const filtroMotoresSchema = z.object({
  q: z.string().trim().max(80).catch("").default(""),
  pagina: z.coerce.number().int().min(1).catch(1).default(1),
});
export type FiltroMotores = z.output<typeof filtroMotoresSchema>;

/** "VW EA111 1.6 8v" a partir dos campos do motor. */
export function descricaoMotor(m: {
  marca?: string | null;
  modelo?: string | null;
  codigo_motor?: string | null;
  cilindrada?: string | null;
}): string {
  const partes = [m.marca, m.modelo, m.codigo_motor].filter(Boolean);
  return partes.length ? partes.join(" ") : "Motor sem identificação";
}
