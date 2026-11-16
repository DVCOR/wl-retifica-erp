import { Badge } from "@/components/ui/badge";
import type { OsStatus } from "@/lib/auth/permissoes";
import { STATUS_OS } from "@/lib/os/status";
import { cn } from "@/lib/utils";

/** Selo do status da OS com as cores do tema. */
export function StatusBadge({ status, className }: { status: OsStatus; className?: string }) {
  const s = STATUS_OS[status];
  return (
    <Badge variant={s.tom} className={cn(status === "cancelado" && "line-through", className)} title={s.descricao}>
      {s.rotulo}
    </Badge>
  );
}
