"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { COOKIE_SESSAO, SUPABASE_ANON_KEY, urlSupabaseNavegador } from "@/lib/env";

let cliente: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Cliente Supabase do navegador (anon key + sessão em cookie). Singleton. */
export function criarClienteNavegador() {
  cliente ??= createBrowserClient<Database>(urlSupabaseNavegador(), SUPABASE_ANON_KEY, {
    cookieOptions: { name: COOKIE_SESSAO },
  });
  return cliente;
}
