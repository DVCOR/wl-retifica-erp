"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import { cn } from "@/lib/utils";
import { itemAtivo, itensCelular, type ItemNav } from "./nav-itens";

const classeItem =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium text-texto-secundario";

/**
 * Barra inferior do celular (< md): até 4 atalhos + botão central "Nova OS"
 * (se o papel abre OS). O resto vai para "Mais".
 */
export function BottomNav() {
  const caminho = usePathname();
  const { empresa, membro } = useEmpresa();
  const { pode } = usePermissao();
  const [maisAberto, setMaisAberto] = React.useState(false);

  const itens = itensCelular(membro.papel);
  const podeAbrir = pode("os.abrir");
  const qtdDiretos = itens.length <= 4 ? itens.length : 3;
  const diretos = itens.slice(0, qtdDiretos);
  const resto = itens.slice(qtdDiretos);
  const metade = Math.ceil(diretos.length / 2);

  const link = (item: ItemNav) => {
    const ativo = itemAtivo(caminho, empresa.slug, item.rota);
    return (
      <Link
        key={item.rota}
        href={`/${empresa.slug}/${item.rota}`}
        aria-current={ativo ? "page" : undefined}
        className={cn(classeItem, ativo && "font-semibold text-primaria")}
      >
        <item.icone className="size-6" aria-hidden />
        {item.curto}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 border-t border-borda bg-superficie px-2 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] md:hidden"
      >
        {diretos.slice(0, metade).map(link)}
        {podeAbrir && (
          <div className="flex flex-1 items-start justify-center">
            <Link
              href={`/${empresa.slug}/os/nova`}
              aria-label="Nova OS"
              className="-mt-5 flex size-14 items-center justify-center rounded-full bg-primaria text-white shadow-lg ring-4 ring-superficie hover:bg-primaria-hover"
            >
              <Plus className="size-7" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        )}
        {diretos.slice(metade).map(link)}
        {resto.length > 0 && (
          <button
            type="button"
            className={cn(
              classeItem,
              resto.some((i) => itemAtivo(caminho, empresa.slug, i.rota)) && "text-primaria",
            )}
            onClick={() => setMaisAberto(true)}
          >
            <Menu className="size-6" aria-hidden />
            Mais
          </button>
        )}
      </nav>

      <Sheet open={maisAberto} onOpenChange={setMaisAberto}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Mais opções</SheetTitle>
            <SheetDescription className="sr-only">Outras telas do sistema</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-3 pb-4">
            {resto.map((item) => {
              const ativo = itemAtivo(caminho, empresa.slug, item.rota);
              return (
                <Link
                  key={item.rota}
                  href={`/${empresa.slug}/${item.rota}`}
                  onClick={() => setMaisAberto(false)}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg px-3 text-base text-texto hover:bg-fundo",
                    ativo && "bg-primaria-suave font-semibold text-primaria-hover",
                  )}
                >
                  <item.icone className="size-5" aria-hidden />
                  {item.rotulo}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
