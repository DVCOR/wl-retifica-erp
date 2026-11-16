"use client";

import * as React from "react";
import { formatarDuracao } from "@/lib/os/cronometro";

/** Tempo decorrido: `baseMs` já acumulado + tempo desde `desde` (ISO), se estiver rodando. */
export function Cronometro({
  baseMs = 0,
  desde,
  className,
}: {
  baseMs?: number;
  desde?: string | null;
  className?: string;
}) {
  const [agora, setAgora] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!desde) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [desde]);
  const ms = baseMs + (desde ? Math.max(0, agora - Date.parse(desde)) : 0);
  return (
    <time className={className} aria-label="Tempo decorrido" suppressHydrationWarning>
      {formatarDuracao(ms)}
    </time>
  );
}
