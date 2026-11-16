"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { BuscaDialogo } from "@/components/busca/busca-dialogo";
import { cn } from "@/lib/utils";

/**
 * Campo de busca do topo (atalhos "/" e Ctrl+K). No celular vira um ícone que
 * abre a busca em tela cheia. Resultados e navegação: components/busca.
 */
export function BuscaGlobal({ className }: { className?: string }) {
  const [aberto, setAberto] = React.useState(false);

  React.useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      const digitando =
        alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable);
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !digitando)) {
        e.preventDefault();
        setAberto(true);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn(
          "ml-auto flex size-11 shrink-0 items-center justify-center rounded-lg border border-preto-borda bg-preto-2 text-texto-claro transition-colors hover:border-texto-secundario sm:hidden",
        )}
        aria-label="Buscar cliente, placa, motor ou nº da OS"
      >
        <Search className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn(
          "hidden h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-preto-borda bg-preto-2 px-3.5 text-left text-[15px] text-texto-claro transition-colors hover:border-texto-secundario sm:flex",
          className,
        )}
        aria-label="Busca global: cliente, placa, motor ou nº da OS"
        aria-keyshortcuts="/ Control+K"
      >
        <Search className="size-[18px] shrink-0" aria-hidden />
        <span className="truncate">Buscar cliente, placa, motor ou nº da OS</span>
        <kbd className="ml-auto hidden rounded-md border border-texto-secundario px-1.5 py-0.5 font-mono text-xs md:inline">
          /
        </kbd>
      </button>
      <BuscaDialogo aberto={aberto} aoMudar={setAberto} />
    </>
  );
}
