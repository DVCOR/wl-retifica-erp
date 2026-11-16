/**
 * Regras puras do orçamento (sem banco), espelhando os triggers do Postgres:
 * total do item = round(qtd × preço, 2) − desconto; subtotal = soma dos itens;
 * total = max(subtotal − desconto no total, 0); limite de desconto =
 * (descontos dos itens + desconto total) ÷ bruto, conferido em enviar_orcamento().
 */
import { arredondar } from "@/lib/catalogo/calculos";
import type { Papel } from "@/lib/auth/permissoes";

export type ItemCalculo = {
  quantidade: number;
  precoUnitario: number;
  desconto: number;
};

export type Totais = {
  /** Soma de quantidade × preço, antes de qualquer desconto. */
  bruto: number;
  descontoItens: number;
  subtotal: number;
  descontoTotal: number;
  total: number;
  /** Desconto somado (itens + total) em % do bruto. */
  descontoPct: number;
};

export function brutoItem(i: Pick<ItemCalculo, "quantidade" | "precoUnitario">): number {
  return arredondar(i.quantidade * i.precoUnitario);
}

/** Desconto do item nunca passa do valor bruto (o banco recusa). */
export function limitarDescontoItem(i: ItemCalculo): number {
  return Math.min(Math.max(i.desconto, 0), brutoItem(i));
}

export function totalItem(i: ItemCalculo): number {
  return arredondar(brutoItem(i) - limitarDescontoItem(i));
}

export function calcularTotais(itens: readonly ItemCalculo[], descontoTotal = 0): Totais {
  const bruto = arredondar(itens.reduce((acc, i) => acc + brutoItem(i), 0));
  const descontoItens = arredondar(itens.reduce((acc, i) => acc + limitarDescontoItem(i), 0));
  const subtotal = arredondar(itens.reduce((acc, i) => acc + totalItem(i), 0));
  const descTotal = Math.max(descontoTotal, 0);
  const total = Math.max(arredondar(subtotal - descTotal), 0);
  const descontoPct = bruto > 0 ? arredondar(((descontoItens + descTotal) / bruto) * 100) : 0;
  return { bruto, descontoItens, subtotal, descontoTotal: descTotal, total, descontoPct };
}

export type AvaliacaoDesconto = {
  pct: number;
  limitePct: number;
  excede: boolean;
  /** Bloqueia o envio: excede o limite e não é dono nem há aprovação do dono. */
  bloqueado: boolean;
  mensagem: string | null;
};

export const MENSAGEM_PRECISA_APROVACAO = "Desconto acima do seu limite: precisa de aprovação do dono.";

export function avaliarDesconto(opcoes: {
  totais: Pick<Totais, "descontoPct">;
  limitePct: number | null | undefined;
  papel: Papel;
  aprovadoPeloDono?: boolean;
}): AvaliacaoDesconto {
  const limitePct = opcoes.limitePct ?? 0;
  const pct = opcoes.totais.descontoPct;
  const excede = pct > limitePct;
  const livre = opcoes.papel === "dono" || Boolean(opcoes.aprovadoPeloDono);
  const bloqueado = excede && !livre;
  return {
    pct,
    limitePct,
    excede,
    bloqueado,
    mensagem: bloqueado ? MENSAGEM_PRECISA_APROVACAO : null,
  };
}

/** Data (yyyy-mm-dd) de validade: hoje + dias, no fuso de São Paulo. */
export function validadePadrao(dias = 7, agora: Date = new Date()): string {
  const base = new Date(agora.getTime() - 3 * 3600 * 1000); // UTC-3 (sem horário de verão)
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + dias));
  return d.toISOString().slice(0, 10);
}

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "reprovado" | "substituido";

export const ROTULO_STATUS_ORCAMENTO: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  substituido: "Substituído",
};

export function orcamentoEditavel(status: StatusOrcamento): boolean {
  return status === "rascunho";
}

/** Nova versão só depois que a atual saiu do rascunho (enviada, respondida). */
export function podeCriarNovaVersao(status: StatusOrcamento | null | undefined): boolean {
  return status === "enviado" || status === "reprovado" || status === "aprovado";
}

export function proximaVersao(versoes: readonly { versao: number }[]): number {
  return versoes.reduce((max, v) => Math.max(max, v.versao), 0) + 1;
}

/** Orçamento enviado já passou da validade? (datas yyyy-mm-dd) */
export function estaVencido(validade: string | null, hoje: string): boolean {
  return Boolean(validade) && (validade as string) < hoje;
}
