/**
 * Modo de operação do sistema.
 *
 * - Modo local (offline): o sistema roda num computador da oficina, sem
 *   internet, acessado só pela rede local. Sem link público, sem e-mail,
 *   usuários criados pelo dono. `NEXT_PUBLIC_MODO_LOCAL=true`.
 * - Nuvem: qualquer outro valor (ou ausente) — convite por e-mail, link
 *   público do cliente etc.
 *
 * `NEXT_PUBLIC_*` é embutida no build: troque a flag e gere o build de novo.
 */
export function ehModoLocal(valor: string | undefined): boolean {
  return valor?.trim().toLowerCase() === "true";
}

/** O sistema está em modo local (offline)? Funciona no servidor e no navegador. */
export function modoLocal(): boolean {
  return ehModoLocal(process.env.NEXT_PUBLIC_MODO_LOCAL);
}

/** Domínio dos e-mails internos dos usuários que só têm "login" (modo local). */
export const DOMINIO_LOGIN_INTERNO = "wl.local";
