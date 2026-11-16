/**
 * Máscara de moeda "por centavos": quem digita "1250" vê "12,50"
 * (como maquininha). Funções puras usadas por `CampoMoeda`.
 */

export const MAX_DIGITOS_MOEDA = 11;

const numeroBR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1250.5 -> "1.250,50" */
export function formatarNumeroBR(valor: number): string {
  return numeroBR.format(valor);
}

/**
 * Texto digitado -> valor em reais. Só os dígitos contam; vazio ou zero
 * resultam em `null` (campo limpo).
 */
export function valorDeTexto(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "").slice(0, MAX_DIGITOS_MOEDA);
  if (digitos === "") return null;
  const centavos = Number.parseInt(digitos, 10);
  if (centavos === 0) return null;
  return centavos / 100;
}

/** Valor -> texto exibido no campo ("" quando nulo). */
export function textoDeValor(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "";
  return formatarNumeroBR(valor);
}
