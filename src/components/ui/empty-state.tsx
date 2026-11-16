import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icone?: React.ReactNode;
  titulo: string;
  descricao?: React.ReactNode;
  /** Botões/links do próximo passo. */
  acoes?: React.ReactNode;
  className?: string;
};

/** Estado vazio que ensina o próximo passo (SPEC 10.9). */
function EmptyState({ icone, titulo, descricao, acoes, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-borda-forte bg-superficie px-6 py-12 text-center",
        className,
      )}
    >
      {icone && (
        <div className="flex size-14 items-center justify-center rounded-full bg-primaria-suave text-primaria [&_svg]:size-7">
          {icone}
        </div>
      )}
      <h2 className="text-lg font-semibold text-texto">{titulo}</h2>
      {descricao && <div className="max-w-md text-[15px] text-texto-secundario">{descricao}</div>}
      {acoes && <div className="mt-2 flex flex-wrap justify-center gap-2">{acoes}</div>}
    </div>
  );
}

export { EmptyState };
