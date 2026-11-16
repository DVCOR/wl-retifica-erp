import { modoLocal } from "@/lib/modo";

/**
 * Variáveis públicas do Supabase. Têm valor de exemplo para o build não
 * depender do Supabase no ar (nada chama o Supabase em build time).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "anon-key-nao-configurada";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * URL do Supabase usada SÓ no servidor (Server Components, Actions, proxy).
 * Dentro do Docker o servidor alcança o Supabase por um nome interno
 * (ex.: http://kong:8000), enquanto o navegador usa NEXT_PUBLIC_SUPABASE_URL.
 */
export const SUPABASE_URL_SERVIDOR = process.env.SUPABASE_URL_INTERNA?.trim() || SUPABASE_URL;

/**
 * Nome do cookie de sessão. O @supabase/ssr o deriva do host da URL; como o
 * servidor pode usar outra URL (interna) que o navegador, fixamos o nome a
 * partir da URL pública nos dois lados (mesma fórmula padrão da biblioteca,
 * então sessões existentes na nuvem continuam valendo).
 */
export function nomeCookieSessao(urlPublica: string): string {
  try {
    return `sb-${new URL(urlPublica).hostname.split(".")[0]}-auth-token`;
  } catch {
    return "sb-local-auth-token";
  }
}

export const COOKIE_SESSAO = nomeCookieSessao(SUPABASE_URL);

/**
 * Troca o início de uma URL gerada pelo servidor com a URL interna (ex.: URL
 * assinada do Storage) pela URL pública, para o navegador conseguir abrir.
 */
export function urlParaNavegador(url: string, mesmaOrigem = modoLocal()): string {
  const interna = SUPABASE_URL_SERVIDOR.replace(/\/$/, "");
  const publica = SUPABASE_URL.replace(/\/$/, "");
  // Modo local: app e Supabase atendem na mesma origem (Caddy). Devolver o
  // caminho relativo faz a foto abrir tanto por https://wl.local quanto pelo IP.
  if (mesmaOrigem) {
    if (url.startsWith(interna)) return url.slice(interna.length);
    if (url.startsWith(publica)) return url.slice(publica.length);
    return url;
  }
  if (interna === publica || !url.startsWith(interna)) return url;
  return publica + url.slice(interna.length);
}

/**
 * URL do Supabase vista pelo navegador. No modo local, app e Supabase estão na
 * mesma origem, então usamos o endereço que o aparelho abriu (nome ou IP).
 */
export function urlSupabaseNavegador(): string {
  if (modoLocal() && typeof window !== "undefined") return window.location.origin;
  return SUPABASE_URL;
}
