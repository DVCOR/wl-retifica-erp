"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { obterClienteParaOs } from "@/lib/data/recebimento";
import type { ClienteResumo } from "@/lib/recebimento/tipos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { novaOsSchema } from "@/lib/validacoes/recebimento";

const slugSchema = z.string().min(1).max(80);

async function exigirAbrirOs(slug: string) {
  const ctx = await obterContextoEmpresa(slugSchema.parse(slug));
  if (!pode(ctx.membro.papel, "os.abrir")) return null;
  return ctx;
}

/** Dados do cliente escolhido no `SeletorCliente` (tipo e telefone para o wizard). */
export async function obterClienteParaOsAction(
  slug: string,
  clienteId: unknown,
): Promise<ResultadoAcao<ClienteResumo>> {
  const id = z.uuid().safeParse(clienteId);
  if (!id.success) return falha("Cliente inválido.");
  const ctx = await exigirAbrirOs(slug);
  if (!ctx) return falha("Sem permissão para abrir OS.");
  try {
    const cliente = await obterClienteParaOs(ctx.empresa.id, id.data);
    return cliente ? sucesso(cliente) : falha("Cliente não encontrado.");
  } catch {
    return falha("Não foi possível carregar o cliente. Tente de novo.");
  }
}

/** Cria a OS (rascunho em_recebimento, checklist copiado do template padrão). */
export async function criarOsAction(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string; numero: string }>> {
  const dados = novaOsSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await exigirAbrirOs(slug);
  if (!ctx) return falha("Sem permissão para abrir OS.");

  const supabase = await criarClienteServidor();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("tipo")
    .eq("empresa_id", ctx.empresa.id)
    .eq("id", dados.data.cliente_id)
    .maybeSingle();
  if (!cliente) return falha("Cliente não encontrado.");
  const lojista = cliente.tipo === "lojista";

  const { data, error } = await supabase.rpc("criar_os", {
    p_empresa_id: ctx.empresa.id,
    p_cliente_id: dados.data.cliente_id,
    p_motor_id: dados.data.motor_id,
    p_prazo_prometido: dados.data.prazo_prometido,
    p_observacoes: dados.data.observacoes,
    // dados do cliente do lojista só fazem sentido para cliente lojista
    p_cliente_final_nome: lojista ? dados.data.cliente_final_nome : undefined,
    p_cliente_final_placa: lojista ? dados.data.cliente_final_placa : undefined,
    p_cliente_final_telefone: lojista ? dados.data.cliente_final_telefone : undefined,
  });
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath(`/${slug}/os`);
  return sucesso({ id: data.id, numero: data.numero });
}
