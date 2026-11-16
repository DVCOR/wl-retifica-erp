"use server";

import { z } from "zod";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { buscarGlobal } from "@/lib/data/busca";
import type { ResultadoBusca } from "@/lib/busca/busca";

const entradaSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  termo: z.string().trim().min(2).max(80),
});

export async function buscarAction(entrada: unknown): Promise<ResultadoAcao<ResultadoBusca[]>> {
  const dados = entradaSchema.safeParse(entrada);
  if (!dados.success) return sucesso([]);
  try {
    const { empresa } = await obterContextoEmpresa(dados.data.slug);
    return sucesso(await buscarGlobal(empresa.id, dados.data.termo));
  } catch {
    return falha("Não foi possível buscar agora. Tente novamente.");
  }
}
