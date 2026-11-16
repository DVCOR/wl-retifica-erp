"use client";

import { useRealtimeOs } from "./use-realtime-os";

/** Mantém a página atualizada via Realtime (não renderiza nada). */
export function UsarRealtime({ empresaId }: { empresaId: string }) {
  useRealtimeOs(empresaId, ["os", "os_status_historico", "apontamentos"]);
  return null;
}
