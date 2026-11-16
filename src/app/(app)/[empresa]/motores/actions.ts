"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { motorSchema } from "@/lib/validacoes/motores";
import { buscarMotores, type MotorResumo } from "@/lib/data/motores";

const SELECT_RESUMO =
  "id, cliente_id, marca, modelo, codigo_motor, numero_serie, cilindros, valvulas_por_cilindro, veiculo_placa, veiculo_modelo, veiculo_ano";

export async function criarMotor(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao<MotorResumo>> {
  const dados = motorSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "motores.editar")) return falha("Você não pode cadastrar motores.");

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("motores")
    .insert({ ...dados.data, empresa_id: empresa.id })
    .select(SELECT_RESUMO)
    .single();
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath(`/${slug}/motores`);
  if (data.cliente_id) revalidatePath(`/${slug}/clientes/${data.cliente_id}`);
  return sucesso(data);
}

export async function atualizarMotor(
  slug: string,
  id: string,
  entrada: unknown,
): Promise<ResultadoAcao> {
  if (!z.uuid().safeParse(id).success) return falha("Motor inválido.");
  const dados = motorSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);

  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "motores.editar")) return falha("Você não pode editar motores.");

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("motores")
    .update(dados.data)
    .eq("empresa_id", empresa.id)
    .eq("id", id)
    .select("id, cliente_id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Motor não encontrado ou sem permissão.");

  revalidatePath(`/${slug}/motores`);
  revalidatePath(`/${slug}/motores/${id}`);
  if (data[0]!.cliente_id) revalidatePath(`/${slug}/clientes/${data[0]!.cliente_id}`);
  return sucesso();
}

const buscaSchema = z.object({
  termo: z.string().trim().max(80),
  clienteId: z.uuid().nullable().optional(),
});

/** Busca para o seletor de motor (client components). */
export async function buscarMotoresAcao(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao<MotorResumo[]>> {
  const p = buscaSchema.safeParse(entrada);
  if (!p.success) return falha("Busca inválida.");
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "motores.ver")) return falha("Você não pode ver motores.");
  try {
    return sucesso(await buscarMotores(empresa.id, p.data.termo, p.data.clienteId ?? null));
  } catch {
    return falha("Não foi possível buscar motores.");
  }
}
