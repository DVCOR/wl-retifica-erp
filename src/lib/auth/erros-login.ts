import { modoLocal } from "@/lib/modo";

/** Parte do erro do Supabase Auth que interessa para escolher a mensagem. */
export type ErroAuth = {
  name?: string;
  code?: string | number | null;
  status?: number | null;
  message?: string;
};

/** A falha foi de rede/servidor (não chegou ao Auth ou ele está fora do ar)? */
export function ehErroDeRede(erro: ErroAuth): boolean {
  if (erro.name === "AuthRetryableFetchError" || erro.name === "AuthUnknownError") return true;
  if (erro.status === 0 || erro.status === 502 || erro.status === 503 || erro.status === 504)
    return true;
  if (erro.status === undefined || erro.status === null) {
    return /fetch failed|failed to fetch|network|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|timed? ?out/i.test(
      erro.message ?? "",
    );
  }
  return false;
}

/** Mensagem do login em pt-BR; separa "servidor fora do ar" de "senha errada". */
export function mensagemErroLogin(erro: ErroAuth, local: boolean = modoLocal()): string {
  if (ehErroDeRede(erro)) {
    return local
      ? "Não foi possível falar com o servidor da oficina. Confira se o computador do sistema está ligado e se você está na rede da oficina."
      : "Não foi possível falar com o servidor. Confira sua conexão e tente de novo.";
  }
  if (erro.code === "email_not_confirmed") {
    return local
      ? "Este usuário ainda não foi liberado. Fale com o dono."
      : "Confirme seu e-mail pelo link que enviamos.";
  }
  if (erro.code === "user_banned") return "Este usuário está desativado. Fale com o dono.";
  if (erro.status === 429 || erro.code === "over_request_rate_limit") {
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  }
  if (erro.code === "invalid_credentials" || erro.status === 400) {
    return local ? "Usuário ou senha incorretos." : "E-mail ou senha incorretos.";
  }
  return "Não foi possível entrar agora. Tente de novo em instantes.";
}
