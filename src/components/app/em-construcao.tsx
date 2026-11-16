import { HardHat } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** Placeholder das páginas que os módulos das rodadas vão preencher. */
export function EmConstrucao({ modulo, descricao }: { modulo: string; descricao?: string }) {
  return (
    <EmptyState
      icone={<HardHat aria-hidden />}
      titulo="Em construção"
      descricao={
        <>
          <p>
            <strong className="font-semibold text-texto">{modulo}</strong> chega nas próximas entregas.
          </p>
          {descricao && <p className="mt-1">{descricao}</p>}
        </>
      }
    />
  );
}
