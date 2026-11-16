"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { falha, falhaValidacao, sucesso, type ResultadoAcao } from "@/lib/acao";
import { caminhoSeguro } from "@/lib/auth/rotas";
import { loginLinkSchema, loginSenhaSchema } from "@/lib/validacoes/auth";

export async function entrarComSenha(entrada: unknown): Promise<ResultadoAcao> {
  const dados = loginSenhaSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: dados.data.email,
    password: dados.data.senha,
  });
  if (error) {
    return falha(
      error.code === "email_not_confirmed"
        ? "Confirme seu e-mail pelo link que enviamos."
        : "E-mail ou senha incorretos.",
    );
  }
  redirect(caminhoSeguro(dados.data.proximo));
}

export async function enviarLinkMagico(entrada: unknown): Promise<ResultadoAcao> {
  const dados = loginLinkSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const supabase = await criarClienteServidor();
  const destino = new URL("/auth/callback", SITE_URL);
  destino.searchParams.set("proximo", caminhoSeguro(dados.data.proximo));
  const { error } = await supabase.auth.signInWithOtp({
    email: dados.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: destino.toString() },
  });
  // Não revela se o e-mail existe.
  if (error && error.status !== 400 && error.code !== "otp_disabled") {
    return falha("Não foi possível enviar o link agora. Tente de novo em instantes.");
  }
  return sucesso();
}
