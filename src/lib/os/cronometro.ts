/** "00:42:15" a partir de milissegundos. */
export function formatarDuracao(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export type ApontamentoSimples = { inicio: string; fim: string | null };

/** Soma o tempo (ms) de apontamentos; os abertos contam até `agora`. */
export function somarMs(apontamentos: ApontamentoSimples[], agora: number): number {
  return apontamentos.reduce((acc, a) => {
    const ini = Date.parse(a.inicio);
    const fim = a.fim ? Date.parse(a.fim) : agora;
    return acc + Math.max(0, fim - ini);
  }, 0);
}
