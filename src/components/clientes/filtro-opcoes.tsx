import Link from "next/link";
import { cn } from "@/lib/utils";

type Opcao = { valor: string; rotulo: string; href: string };

/** Grupo de filtros em pílulas (links; o estado fica na URL). */
export function FiltroOpcoes({
  rotulo,
  atual,
  opcoes,
}: {
  rotulo: string;
  atual: string;
  opcoes: readonly Opcao[];
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ativo = o.valor === atual;
        return (
          <Link
            key={o.valor}
            href={o.href}
            scroll={false}
            aria-current={ativo ? "true" : undefined}
            className={cn(
              "inline-flex h-11 items-center rounded-lg border px-3.5 text-[15px] font-medium transition-colors",
              ativo
                ? "border-preto bg-preto text-white"
                : "border-borda-forte bg-superficie text-texto hover:bg-fundo",
            )}
          >
            {o.rotulo}
          </Link>
        );
      })}
    </div>
  );
}
