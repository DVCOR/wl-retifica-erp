"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { falha, falhaValidacao, mensagemErroBanco, sucesso, type ResultadoAcao } from "@/lib/acao";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { buscarClientesParaOs, listarMotoresDoCliente } from "@/lib/data/recebimento";
import type { ClienteResumo, MotorResumo } from "@/lib/recebimento/tipos";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  buscaClienteSchema,
  clienteRapidoSchema,
  motorRapidoSchema,
  novaOsSchema,
} from "@/lib/validacoes/recebimento";

const slugSchema = z.string().min(1).max(80);

async function exigirAbrirOs(slug: string) {
  const ctx = await obterContextoEmpresa(slugSchema.parse(slug));
  if (!pode(ctx.membro.papel, "os.abrir")) return null;
  return ctx;
}

export async function buscarClientesAction(
  slug: string,
  termo: unknown,
): Promise<ResultadoAcao<ClienteResumo[]>> {
  const dados = buscaClienteSchema.safeParse({ termo });
  if (!dados.success) return sucesso([]);
  const ctx = await exigirAbrirOs(slug);
  if (!ctx) return falha("Sem permissão para abrir OS.");
  try {
    return sucesso(await buscarClientesParaOs(ctx.empresa.id, dados.data.termo));
  } catch {
    return falha("Não foi possível buscar clientes. Tente de novo.");
  }
}

export async function criarClienteRapidoAction(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao<ClienteResumo>> {
  const dados = clienteRapidoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await exigirAbrirOs(slug);
  if (!ctx || !pode(ctx.membro.papel, "clientes.cadastrar")) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      empresa_id: ctx.empresa.id,
      tipo: dados.data.tipo,
      nome: dados.data.nome,
      telefone_whatsapp: dados.data.telefone_whatsapp ?? null,
      documento: dados.data.documento ?? null,
    })
    .select("id, nome, nome_fantasia, tipo, telefone_whatsapp, documento")
    .single();
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath(`/${slug}/clientes`);
  return sucesso(data);
}

export async function listarMotoresDoClienteAction(
  slug: string,
  clienteId: unknown,
): Promise<ResultadoAcao<MotorResumo[]>> {
  const id = z.string().uuid().safeParse(clienteId);
  if (!id.success) return falha("Cliente inválido.");
  const ctx = await exigirAbrirOs(slug);
  if (!ctx) return falha("Sem permissão para abrir OS.");
  try {
    return sucesso(await listarMotoresDoCliente(ctx.empresa.id, id.data));
  } catch {
    return falha("Não foi possível carregar os motores.");
  }
}

export async function criarMotorRapidoAction(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao<MotorResumo>> {
  const dados = motorRapidoSchema.safeParse(entrada);
  if (!dados.success) return falhaValidacao(dados.error);
  const ctx = await exigirAbrirOs(slug);
  if (!ctx || !pode(ctx.membro.papel, "motores.editar")) return falha("Sem permissão.");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("motores")
    .insert({
      empresa_id: ctx.empresa.id,
      cliente_id: dados.data.cliente_id,
      marca: dados.data.marca ?? null,
      modelo: dados.data.modelo ?? null,
      codigo_motor: dados.data.codigo_motor ?? null,
      numero_serie: dados.data.numero_serie ?? null,
      combustivel: dados.data.combustivel ?? null,
      cilindros: dados.data.cilindros ?? null,
      cilindrada: dados.data.cilindrada ?? null,
      valvulas_por_cilindro: dados.data.valvulas_por_cilindro ?? null,
      veiculo_placa: dados.data.veiculo_placa ?? null,
    })
    .select("id, marca, modelo, codigo_motor, numero_serie, combustivel, cilindros, veiculo_placa")
    .single();
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath(`/${slug}/motores`);
  return sucesso(data);
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
