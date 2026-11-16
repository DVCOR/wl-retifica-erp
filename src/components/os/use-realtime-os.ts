"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";

/**
 * Atualiza a página quando uma OS da empresa muda (Supabase Realtime em `os`).
 * Se o Realtime não estiver disponível (sem Supabase, sem rede), não faz nada:
 * a tela continua funcionando e atualiza ao navegar/recarregar.
 */
export function useRealtimeOs(empresaId: string, tabelas: string[] = ["os"]) {
  const router = useRouter();
  const chave = tabelas.join(",");
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let desligar: (() => void) | undefined;
    try {
      const supabase = criarClienteNavegador();
      let canal = supabase.channel(`os-${empresaId}-${chave}`);
      for (const tabela of chave.split(",")) {
        canal = canal.on(
          "postgres_changes",
          { event: "*", schema: "public", table: tabela, filter: `empresa_id=eq.${empresaId}` },
          () => {
            clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 400);
          },
        );
      }
      canal.subscribe();
      desligar = () => {
        void supabase.removeChannel(canal);
      };
    } catch {
      // sem Realtime: segue sem atualização automática
    }
    return () => {
      clearTimeout(timer);
      desligar?.();
    };
  }, [empresaId, chave, router]);
}
