import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";
import { COOKIE_SESSAO, SUPABASE_ANON_KEY, SUPABASE_URL_SERVIDOR } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies) — a RLS vale. Crie um por requisição.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL_SERVIDOR, SUPABASE_ANON_KEY, {
    cookieOptions: { name: COOKIE_SESSAO },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado de um Server Component: não dá para gravar cookie aqui.
          // O proxy (src/proxy.ts) renova a sessão.
        }
      },
    },
  });
}

export type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;
