import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_URL_SERVIDOR } from "@/lib/env";

/**
 * Cliente com SERVICE ROLE (ignora RLS). Só no servidor e só onde não há
 * usuário logado e a regra está garantida por outro meio — ex.: página pública
 * da OS (assinar URLs das fotos via os_publica_fotos) e envio de convites e gestão de usuários (modo local).
 * Nunca importe em componente cliente.
 */
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  }
  return createClient<Database>(SUPABASE_URL_SERVIDOR, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
