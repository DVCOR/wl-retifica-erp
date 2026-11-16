const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Converte o conteúdo lido da etiqueta em rota do app. A etiqueta traz a URL
 * `/{empresa}/os/{id}`; aceita também URL absoluta da mesma origem ou só o id.
 */
export function rotaDaEtiqueta(
  conteudo: string,
  slug: string,
  origem?: string,
): string | null {
  const texto = conteudo.trim();
  if (UUID.test(texto)) return `/${slug}/os/${texto}`;
  let caminho = texto;
  if (/^https?:\/\//i.test(texto)) {
    try {
      const url = new URL(texto);
      if (origem && url.origin !== origem) return null;
      caminho = url.pathname;
    } catch {
      return null;
    }
  }
  const m = caminho.match(/^\/([a-z0-9-]+)\/os\/([0-9a-f-]{36})\/?$/i);
  if (!m || !UUID.test(m[2])) return null;
  return `/${m[1]}/os/${m[2]}`;
}
