/** Monta "?a=1&b=2" ignorando vazios e padrões (para filtros e paginação na URL). */
export function montarHref(
  base: string,
  params: Record<string, string | number | null | undefined>,
  padroes: Record<string, string | number> = {},
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    if (padroes[k] !== undefined && String(padroes[k]) === String(v)) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
