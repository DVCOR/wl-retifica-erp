import type { OsStatus } from "@/lib/auth/permissoes";
import { hojeSaoPaulo } from "@/lib/os/quadro";

/** Linha mínima de OS usada nas agregações do início. */
export type OsLinha = {
  id: string;
  numero: string;
  status: OsStatus;
  clienteId: string;
  clienteNome: string | null;
  clienteTipo: "lojista" | "final" | null;
  tecnicoId: string | null;
  prazo: string | null;
  criadoEm: string;
  entregueEm: string | null;
};

/** Orçamento aprovado (com o cliente da OS). */
export type AprovadoLinha = {
  osId: string;
  total: number;
  respondidoEm: string;
  clienteId: string;
  clienteNome: string | null;
  clienteTipo: "lojista" | "final" | null;
};

export const STATUS_ABERTOS: readonly OsStatus[] = [
  "em_recebimento",
  "recebido",
  "em_analise",
  "orcamento_enviado",
  "aprovado",
  "reprovado",
  "em_execucao",
  "aguardando_peca",
  "pronto",
];

const MS_DIA = 86_400_000;

/** Data local (America/Sao_Paulo) "aaaa-mm-dd" de um instante ISO. */
export function dataLocal(iso: string): string {
  return hojeSaoPaulo(new Date(iso));
}

/** "aaaa-mm" de uma data "aaaa-mm-dd". */
export function mesDe(data: string): string {
  return data.slice(0, 7);
}

export function estaAberta(status: OsStatus): boolean {
  return STATUS_ABERTOS.includes(status);
}

export function contarPorStatus(os: readonly OsLinha[]): Partial<Record<OsStatus, number>> {
  const r: Partial<Record<OsStatus, number>> = {};
  for (const o of os) if (estaAberta(o.status)) r[o.status] = (r[o.status] ?? 0) + 1;
  return r;
}

/** OS aberta cujo prazo prometido já passou (hoje ainda está no prazo). */
export function osAtrasadas(os: readonly OsLinha[], hoje: string): OsLinha[] {
  return os
    .filter((o) => estaAberta(o.status) && o.status !== "pronto" && !!o.prazo && o.prazo < hoje)
    .sort((a, b) => (a.prazo ?? "").localeCompare(b.prazo ?? ""));
}

export function entreguesNoMes(os: readonly OsLinha[], hoje: string): OsLinha[] {
  return os.filter(
    (o) =>
      o.status === "entregue" && o.entregueEm && mesDe(dataLocal(o.entregueEm)) === mesDe(hoje),
  );
}

export function aprovadosNoMes(aprovados: readonly AprovadoLinha[], hoje: string): AprovadoLinha[] {
  return aprovados.filter((a) => mesDe(dataLocal(a.respondidoEm)) === mesDe(hoje));
}

export function somar(valores: readonly number[]): number {
  return Math.round(valores.reduce((s, v) => s + v, 0) * 100) / 100;
}

/** Ticket médio = valor aprovado ÷ nº de orçamentos aprovados; null sem aprovados. */
export function ticketMedio(aprovados: readonly AprovadoLinha[]): number | null {
  if (aprovados.length === 0) return null;
  return Math.round((somar(aprovados.map((a) => a.total)) / aprovados.length) * 100) / 100;
}

/** Percentual (0–100, inteiro) de OS de lojista e de cliente final. */
export function percentualLojista(
  os: readonly OsLinha[],
): { lojista: number; final: number } | null {
  const validas = os.filter((o) => o.clienteTipo);
  if (validas.length === 0) return null;
  const lojista = Math.round(
    (validas.filter((o) => o.clienteTipo === "lojista").length / validas.length) * 100,
  );
  return { lojista, final: 100 - lojista };
}

export type PontoSemana = { inicio: string; rotulo: string; abertas: number; entregues: number };

function somarDias(data: string, dias: number): string {
  return new Date(Date.parse(`${data}T00:00:00Z`) + dias * MS_DIA).toISOString().slice(0, 10);
}

/** Segunda-feira da semana de `data`. */
export function inicioDaSemana(data: string): string {
  const dow = new Date(`${data}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return somarDias(data, -((dow + 6) % 7));
}

/** OS abertas (criadas) e entregues por semana, das últimas `n` semanas (mais antiga primeiro). */
export function serieSemanal(os: readonly OsLinha[], hoje: string, n = 8): PontoSemana[] {
  const atual = inicioDaSemana(hoje);
  const pontos: PontoSemana[] = Array.from({ length: n }, (_, i) => {
    const inicio = somarDias(atual, -7 * (n - 1 - i));
    const [, m, d] = inicio.split("-");
    return { inicio, rotulo: `${d}/${m}`, abertas: 0, entregues: 0 };
  });
  const indice = (data: string) => pontos.findIndex((p) => p.inicio === inicioDaSemana(data));
  for (const o of os) {
    if (o.status === "cancelado") continue;
    const ia = indice(dataLocal(o.criadoEm));
    if (ia >= 0) pontos[ia].abertas++;
    if (o.entregueEm) {
      const ie = indice(dataLocal(o.entregueEm));
      if (ie >= 0) pontos[ie].entregues++;
    }
  }
  return pontos;
}

export type LinhaRanking = { clienteId: string; nome: string; valor: number; qtd: number };

/** Top lojistas por valor aprovado (recebe os aprovados já filtrados pelo período). */
export function rankingLojistas(aprovados: readonly AprovadoLinha[], limite = 5): LinhaRanking[] {
  const m = new Map<string, LinhaRanking>();
  for (const a of aprovados) {
    if (a.clienteTipo !== "lojista") continue;
    const l = m.get(a.clienteId) ?? {
      clienteId: a.clienteId,
      nome: a.clienteNome ?? "Cliente",
      valor: 0,
      qtd: 0,
    };
    l.valor = somar([l.valor, a.total]);
    l.qtd++;
    m.set(a.clienteId, l);
  }
  return [...m.values()].sort((a, b) => b.valor - a.valor).slice(0, limite);
}

/** Dias inteiros entre duas datas "aaaa-mm-dd" (b - a). */
export function diasEntreDatas(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS_DIA);
}

/**
 * Orçamentos enviados sem resposta há mais de `dias` dias.
 * `enviadoEm`: os_id → instante do envio.
 */
export function orcamentosParados(
  os: readonly OsLinha[],
  enviadoEm: ReadonlyMap<string, string>,
  hoje: string,
  dias: number,
): (OsLinha & { diasParado: number })[] {
  return os
    .filter((o) => o.status === "orcamento_enviado" && enviadoEm.has(o.id))
    .map((o) => ({ ...o, diasParado: diasEntreDatas(dataLocal(enviadoEm.get(o.id)!), hoje) }))
    .filter((o) => o.diasParado > dias)
    .sort((a, b) => b.diasParado - a.diasParado);
}

/** OS recebidas hoje ou ainda em recebimento. */
export function filaRecebimento(os: readonly OsLinha[], hoje: string): OsLinha[] {
  return os.filter(
    (o) =>
      o.status === "em_recebimento" ||
      (["recebido", "em_analise"].includes(o.status) && dataLocal(o.criadoEm) === hoje),
  );
}
