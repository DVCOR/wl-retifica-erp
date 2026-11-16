"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useEmpresa } from "@/lib/auth/empresa-context";
import { itensDoPapel } from "./nav-itens";
import { cn } from "@/lib/utils";

/**
 * Campo de busca do topo. Abre um command dialog (atalhos "/" e Ctrl+K).
 * Por enquanto só navega pelo menu; o agente da busca (feat/busca-dashboard)
 * liga os resultados na função SQL public.buscar(empresa_id, termo).
 */
export function BuscaGlobal({ className }: { className?: string }) {
  const [aberto, setAberto] = React.useState(false);
  const [termo, setTermo] = React.useState("");
  const router = useRouter();
  const { empresa, membro } = useEmpresa();

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

  const ir = (href: string) => {
    setAberto(false);
    setTermo("");
    router.push(href);
  };

  const atalhos = itensDoPapel(membro.papel).filter((i) =>
    i.rotulo.toLowerCase().includes(termo.trim().toLowerCase()),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-preto-borda bg-preto-2 px-3.5 text-left text-[15px] text-texto-claro transition-colors hover:border-texto-secundario",
          className,
        )}
        aria-label="Busca global: cliente, placa, motor ou nº da OS"
        aria-keyshortcuts="/ Control+K"
      >
        <Search className="size-[18px] shrink-0" aria-hidden />
        <span className="truncate">
          <span className="hidden sm:inline">Buscar cliente, placa, motor ou nº da OS</span>
          <span className="sm:hidden">Cliente, placa, motor ou OS</span>
        </span>
        <kbd className="ml-auto hidden rounded-md border border-texto-secundario px-1.5 py-0.5 font-mono text-xs md:inline">
          /
        </kbd>
      </button>

      <CommandDialog open={aberto} onOpenChange={setAberto}>
        <CommandInput
          placeholder="Buscar cliente, placa, motor ou nº da OS"
          value={termo}
          onValueChange={setTermo}
        />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          {atalhos.length > 0 && (
            <CommandGroup heading="Ir para">
              {atalhos.map((i) => (
                <CommandItem
                  key={i.rota}
                  value={i.rota}
                  onSelect={() => ir(`/${empresa.slug}/${i.rota}`)}
                >
                  <i.icone aria-hidden />
                  {i.rotulo}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <p className="px-3 pt-3 pb-1 text-xs text-texto-secundario">
            A busca por clientes, placas, motores e OS será ligada em breve.
          </p>
        </CommandList>
      </CommandDialog>
    </>
  );
}
