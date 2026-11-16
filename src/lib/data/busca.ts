import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ResultadoBusca, TipoResultado } from "@/lib/busca/busca";

const TIPOS: readonly string[] = ["cliente", "motor", "os"];

/** Busca global via RPC `buscar` (invoker: a RLS vale; filtra pela empresa). */
export async function buscarGlobal(
  empresaId: string,
  termo: string,
  limite = 20,
): Promise<ResultadoBusca[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("buscar", {
    p_empresa_id: empresaId,
    p_termo: termo,
    p_limite: limite,
  });
  if (error) throw new Error(`Erro na busca: ${error.message}`);
  return (data ?? [])
    .filter((r) => TIPOS.includes(r.tipo))
    .map((r) => ({
      tipo: r.tipo as TipoResultado,
      id: r.id,
      titulo: r.titulo ?? "",
      subtitulo: r.subtitulo ?? "",
    }));
}
