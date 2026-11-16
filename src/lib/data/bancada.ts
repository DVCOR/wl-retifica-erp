import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { descricaoMotor } from "@/lib/validacoes/motores";
import type { OsStatus } from "@/lib/auth/permissoes";

/** Dados da bancada do técnico (sem preços). */

export type OsBancada = {
  id: string;
  numero: string;
  status: OsStatus;
  motor: string;
  prazo: string | null;
  tecnicoId: string | null;
};

export const STATUS_BANCADA: OsStatus[] = [
  "recebido",
  "em_analise",
  "aprovado",
  "em_execucao",
  "aguardando_peca",
];

export async function listarMinhasOs(empresaId: string, membroId: string): Promise<OsBancada[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os")
    .select(
      "id, numero, status, prazo_prometido, tecnico_id, motores(marca, modelo, codigo_motor)",
    )
    .eq("empresa_id", empresaId)
    .eq("tecnico_id", membroId)
    .in("status", STATUS_BANCADA)
    .order("prazo_prometido", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Erro ao listar suas OS: ${error.message}`);
  return data.map((o) => {
    const m = o.motores as unknown as {
      marca: string | null;
      modelo: string | null;
      codigo_motor: string | null;
    } | null;
    return {
      id: o.id,
      numero: o.numero,
      status: o.status,
      motor: m ? descricaoMotor(m) : "Sem motor",
      prazo: o.prazo_prometido,
      tecnicoId: o.tecnico_id,
    };
  });
}

export type MedicaoBancada = {
  id: string;
  componente: string;
  descricao: string;
  valor: number | null;
  valor_texto: string | null;
  unidade: string | null;
  minimo: number | null;
  maximo: number | null;
  conforme: boolean | null;
};

export async function listarMedicoesOs(empresaId: string, osId: string): Promise<MedicaoBancada[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("os_medicoes")
    .select("id, componente, descricao, valor, valor_texto, unidade, minimo, maximo, conforme")
    .eq("empresa_id", empresaId)
    .eq("os_id", osId)
    .order("created_at");
  if (error) throw new Error(`Erro ao listar medições: ${error.message}`);
  return data.map((m) => ({
    ...m,
    valor: m.valor === null ? null : Number(m.valor),
    minimo: m.minimo === null ? null : Number(m.minimo),
    maximo: m.maximo === null ? null : Number(m.maximo),
  }));
}
