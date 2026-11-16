"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { falha, falhaValidacao, sucesso, type ResultadoAcao } from "@/lib/acao";
import { clienteAnonimo, tokenValido } from "@/lib/data/orcamento-publico";
import { modoLocal } from "@/lib/modo";
import { respostaPublicaSchema } from "@/lib/validacoes/orcamento";

/** Aprovar/reprovar pelo link público. Grava nome, IP e user-agent (no banco). */
export async function responderPublicoAction(
  token: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  if (modoLocal()) return falha("Link indisponível.");
  const dados = respostaPublicaSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  if (!tokenValido(token)) return falha("Link inválido.");

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || undefined;
  const userAgent = h.get("user-agent")?.slice(0, 300) || undefined;

  const { error } = await clienteAnonimo().rpc("responder_orcamento_publico", {
    p_token: token,
    p_aprovar: dados.data.aprovar,
    p_nome: dados.data.nome,
    p_ip: ip,
    p_user_agent: userAgent,
  });
  if (error) {
    // Mensagens de regra do banco (P0001/P0002) já estão em pt-BR.
    return falha(
      error.code === "P0001" || error.code === "P0002"
        ? error.message
        : "Não foi possível registrar sua resposta. Tente novamente.",
    );
  }
  revalidatePath(`/os-publica/${token}`);
  return sucesso();
}
