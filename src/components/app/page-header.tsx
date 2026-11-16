import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  /** Botões à direita (no celular quebram para baixo). */
  acoes?: React.ReactNode;
  voltar?: { href: string; rotulo: string };
  className?: string;
};

/** Cabeçalho padrão das páginas (título, descrição, ações). */
export function PageHeader({ titulo, descricao, acoes, voltar, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {voltar && (
          <Link
            href={voltar.href}
            className="-ml-2 mb-1 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-texto-secundario hover:text-texto"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {voltar.rotulo}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-texto md:text-[26px]">{titulo}</h1>
        {descricao && <p className="mt-1 text-[15px] text-texto-secundario">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}
