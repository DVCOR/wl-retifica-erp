/** Cookie com o slug da última empresa acessada (usado pela rota "/"). */
export const COOKIE_EMPRESA = "wl_empresa";

/** Primeiros segmentos que NÃO são slug de empresa. */
export const SEGMENTOS_RESERVADOS = new Set([
  "login",
  "convite",
  "esqueci-senha",
  "auth",
  "os-publica",
  "sem-empresa",
  "api",
  "_next",
]);

const PREFIXOS_PUBLICOS = ["/login", "/esqueci-senha", "/convite/", "/auth/", "/os-publica/"];

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

const ORIGEM_FICTICIA = "http://interno.invalid";

/**
 * Só aceita redirecionamento interno (evita open redirect no ?proximo=).
 * Rejeita barra invertida e caracteres de controle (o parser de URL descarta
 * TAB/LF, então "/\t/evil.com" viraria "//evil.com") e confere, resolvendo a
 * URL, que a origem não mudou. Devolve o caminho normalizado.
 */
export function caminhoSeguro(proximo: string | null | undefined, padrao = "/"): string {
  if (
    !proximo ||
    !proximo.startsWith("/") ||
    proximo.startsWith("//") ||
    proximo.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(proximo)
  ) {
    return padrao;
  }
  try {
    const url = new URL(proximo, ORIGEM_FICTICIA);
    if (url.origin !== ORIGEM_FICTICIA || url.pathname.startsWith("//")) return padrao;
    return url.pathname + url.search + url.hash;
  } catch {
    return padrao;
  }
}
