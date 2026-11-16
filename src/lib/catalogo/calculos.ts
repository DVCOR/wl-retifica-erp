/**
 * Regras puras de preço do catálogo (sem acesso a banco), espelhando
 * `_preco_sugerido()` do Postgres: preço específico na tabela vence; senão
 * preço base × (1 − desconto da tabela), arredondado em centavos.
 */

export type UnidadeServico = "un" | "cilindro" | "valvula" | "hora";

export const UNIDADES_SERVICO: readonly UnidadeServico[] = ["un", "cilindro", "valvula", "hora"];

export const ROTULO_UNIDADE: Record<UnidadeServico, string> = {
  un: "Unidade",
  cilindro: "Cilindro",
  valvula: "Válvula",
  hora: "Hora",
};

/** "por cilindro", "por hora"... usado ao lado do preço. */
export const ROTULO_UNIDADE_CURTO: Record<UnidadeServico, string> = {
  un: "un",
  cilindro: "cilindro",
  valvula: "válvula",
  hora: "hora",
};

export function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Preço efetivo de um item numa tabela de preço. */
export function precoEfetivo(opcoes: {
  precoBase: number;
  descontoPct?: number | null;
  /** Preço específico do item na tabela (tabela_preco_itens). */
  precoEspecifico?: number | null;
}): number {
  const { precoBase, descontoPct, precoEspecifico } = opcoes;
  if (precoEspecifico !== null && precoEspecifico !== undefined) return arredondar(precoEspecifico);
  const desc = Math.min(Math.max(descontoPct ?? 0, 0), 100);
  return arredondar(precoBase * (1 - desc / 100));
}

export type ItemParaTotal = { quantidade: number; preco: number | null };

/** Total estimado de um kit (ignora itens sem preço). */
export function totalKit(itens: readonly ItemParaTotal[]): number {
  return arredondar(itens.reduce((acc, i) => acc + i.quantidade * (i.preco ?? 0), 0));
}

/** Percentual de diferença do efetivo sobre a base (positivo = desconto). */
export function descontoEfetivoPct(precoBase: number, efetivo: number): number {
  if (precoBase <= 0) return 0;
  return arredondar((1 - efetivo / precoBase) * 100);
}

/** Usado pela tabela de preço: `Map` por id do item. */
export function chaveItem(tipo: "servico" | "peca", id: string): string {
  return `${tipo}:${id}`;
}
