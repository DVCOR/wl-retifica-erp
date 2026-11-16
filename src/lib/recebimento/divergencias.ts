/** Regras puras do checklist de recebimento (sem I/O). */

export type StatusItem = "ok" | "danificado" | "ausente" | "na";

export type ItemChecklist = {
  id: string;
  grupo: string;
  descricao: string;
  ordem: number;
  exige_quantidade: boolean;
  status: StatusItem;
  quantidade: number | null;
  observacao: string | null;
};

export type GrupoChecklist = {
  nome: string;
  itens: ItemChecklist[];
  /** Itens danificados ou ausentes. */
  divergencias: number;
  /** Todos os itens do grupo estão como N/A. */
  todoNa: boolean;
};

export const ROTULO_STATUS: Record<StatusItem, string> = {
  ok: "OK",
  danificado: "Danificado",
  ausente: "Ausente",
  na: "N/A",
};

/** Divergência = item danificado ou ausente (N/A não conta). */
export function ehDivergencia(status: StatusItem): boolean {
  return status === "danificado" || status === "ausente";
}

export function contarDivergencias(itens: readonly Pick<ItemChecklist, "status">[]): number {
  return itens.filter((i) => ehDivergencia(i.status)).length;
}

export function listarDivergencias<T extends ItemChecklist>(itens: readonly T[]): T[] {
  return itens
    .filter((i) => ehDivergencia(i.status))
    .sort((a, b) => a.ordem - b.ordem || a.descricao.localeCompare(b.descricao, "pt-BR"));
}

/** Agrupa preservando a ordem de aparição dos grupos (por `ordem` dos itens). */
export function agruparPorGrupo(itens: readonly ItemChecklist[]): GrupoChecklist[] {
  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem);
  const mapa = new Map<string, ItemChecklist[]>();
  for (const item of ordenados) {
    const lista = mapa.get(item.grupo);
    if (lista) lista.push(item);
    else mapa.set(item.grupo, [item]);
  }
  return [...mapa.entries()].map(([nome, lista]) => ({
    nome,
    itens: lista,
    divergencias: contarDivergencias(lista),
    todoNa: lista.length > 0 && lista.every((i) => i.status === "na"),
  }));
}

/** "Quantidade: 8" ou "" — usado no resumo e no PDF. */
export function descreverItem(
  item: Pick<ItemChecklist, "descricao" | "exige_quantidade" | "quantidade">,
): string {
  if (item.exige_quantidade && item.quantidade !== null) {
    return `${item.descricao} (${formatarQuantidade(item.quantidade)})`;
  }
  return item.descricao;
}

export function formatarQuantidade(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toLocaleString("pt-BR");
}
