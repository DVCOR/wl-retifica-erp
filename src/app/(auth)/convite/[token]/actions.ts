"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { aceitarConviteSchema } from "@/lib/validacoes/auth";

export async function aceitarConvite(entrada: unknown): Promise<ResultadoAcao> {
  const dados = aceitarConviteSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const supabase = await criarClienteServidor();
  const { data: slug, error } = await supabase.rpc("aceitar_convite", {
    p_token: dados.data.token,
    p_nome: dados.data.nome || undefined,
  });
  if (error || !slug) return falha(mensagemErroBanco(error));
  redirect(`/${slug}/inicio`);
}

/** Envia link de acesso para o e-mail convidado (cria a conta se não existir). */
export async function enviarLinkConvite(entrada: unknown): Promise<ResultadoAcao> {
  const dados = z.object({ token: z.string().uuid() }).safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const supabase = await criarClienteServidor();
  const { data: info } = await supabase.rpc("convite_info", { p_token: dados.data.token });
  const convite = info as { email?: string; expirado?: boolean; aceito?: boolean } | null;
  if (!convite?.email || convite.expirado || convite.aceito)
    return falha("Convite inválido ou expirado.");

  const destino = new URL("/auth/callback", SITE_URL);
  destino.searchParams.set("proximo", `/convite/${dados.data.token}`);
  const { error } = await supabase.auth.signInWithOtp({
    email: convite.email,
    options: { shouldCreateUser: true, emailRedirectTo: destino.toString() },
  });
  if (error) return falha("Não foi possível enviar o link agora. Tente de novo em instantes.");
  return sucesso();
}
