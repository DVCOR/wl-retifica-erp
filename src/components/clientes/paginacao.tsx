import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  pagina: number;
  porPagina: number;
  total: number;
  /** Gera o href de uma página. */
  href: (pagina: number) => string;
  className?: string;
};

const classeBotao =
  "inline-flex h-11 items-center gap-1 rounded-lg border border-borda-forte bg-superficie px-3.5 text-[15px] font-medium text-texto hover:bg-fundo";

/** Paginação anterior/próxima com contagem, por links (funciona sem JS). */
export function Paginacao({ pagina, porPagina, total, href, className }: Props) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (total === 0) return null;
  const de = (pagina - 1) * porPagina + 1;
  const ate = Math.min(total, pagina * porPagina);
  return (
    <nav
      aria-label="Paginação"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      <p className="text-sm text-texto-secundario">
        {de}–{ate} de {total}
      </p>
      <div className="flex items-center gap-2">
        {pagina > 1 ? (
          <Link href={href(pagina - 1)} className={classeBotao} scroll={false}>
            <ChevronLeft className="size-4" aria-hidden />
            Anterior
          </Link>
        ) : (
          <span className={cn(classeBotao, "pointer-events-none opacity-50")} aria-disabled>
            <ChevronLeft className="size-4" aria-hidden />
            Anterior
          </span>
        )}
        <span className="px-1 text-sm text-texto-secundario">
          {pagina}/{paginas}
        </span>
        {pagina < paginas ? (
          <Link href={href(pagina + 1)} className={classeBotao} scroll={false}>
            Próxima
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cn(classeBotao, "pointer-events-none opacity-50")} aria-disabled>
            Próxima
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
