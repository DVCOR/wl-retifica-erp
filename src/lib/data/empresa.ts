import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel } from "@/lib/auth/permissoes";

/**
 * Dados da empresa e membros (módulo configurações). Funções server-only:
 * usam o cliente com a sessão do usuário, então a RLS filtra por empresa e papel.
 */

export type DadosEmpresa = {
  id: string;
  slug: string;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: Record<string, string | undefined>;
  created_at: string;
};

export async function obterDadosEmpresa(empresaId: string): Promise<DadosEmpresa | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, slug, nome_fantasia, razao_social, cnpj, telefone, email, endereco, created_at")
    .eq("id", empresaId)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar a empresa: ${error.message}`);
  if (!data) return null;
  return { ...data, endereco: (data.endereco ?? {}) as Record<string, string | undefined> };
}

export type MembroLista = {
  id: string;
  nome: string;
  papel: Papel;
  limite_desconto_pct: number;
  ativo: boolean;
  created_at: string;
};

export async function listarMembros(empresaId: string): Promise<MembroLista[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("membros")
    .select("id, nome, papel, limite_desconto_pct, ativo, created_at")
    .eq("empresa_id", empresaId)
    .order("ativo", { ascending: false })
    .order("nome");
  if (error) throw new Error(`Erro ao listar membros: ${error.message}`);
  return (data ?? []).map((m) => ({ ...m, limite_desconto_pct: Number(m.limite_desconto_pct) }));
}
