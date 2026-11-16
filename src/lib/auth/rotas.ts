/** Cookie com o slug da última empresa acessada (usado pela rota "/"). */
export const COOKIE_EMPRESA = "wl_empresa";

/** Primeiros segmentos que NÃO são slug de empresa. */
export const SEGMENTOS_RESERVADOS = new Set([
  "login",
  "convite",
  "auth",
  "os-publica",
  "sem-empresa",
  "api",
  "_next",
]);

const PREFIXOS_PUBLICOS = ["/login", "/convite/", "/auth/", "/os-publica/"];

export function ehRotaPublica(caminho: string): boolean {
  return PREFIXOS_PUBLICOS.some((p) => caminho === p.replace(/\/$/, "") || caminho.startsWith(p));
}

/** "/wl-retifica/os/123" -> "wl-retifica"; "/login" -> null. */
export function slugDaRota(caminho: string): string | null {
  const primeiro = caminho.split("/")[1] ?? "";
  if (!primeiro || SEGMENTOS_RESERVADOS.has(primeiro) || primeiro.includes(".")) return null;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(primeiro) ? primeiro : null;
}

/** Monta rota dentro da empresa: rotaEmpresa("wl", "os", id) -> "/wl/os/<id>". */
export function rotaEmpresa(slug: string, ...partes: string[]): string {
  return "/" + [slug, ...partes].filter(Boolean).join("/");
}

/** Só aceita redirecionamento interno (evita open redirect no ?proximo=). */
export function caminhoSeguro(proximo: string | null | undefined, padrao = "/"): string {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//") || proximo.startsWith("/\\")) {
    return padrao;
  }
  return proximo;
}
