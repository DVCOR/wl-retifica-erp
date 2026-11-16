"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEmpresa } from "@/lib/auth/empresa-context";
import { cn } from "@/lib/utils";
import { itemAtivo, itensDoPapel } from "./nav-itens";

/** Menu lateral (tablet e desktop, a partir de md). */
export function SidebarNav() {
  const caminho = usePathname();
  const { empresa, membro } = useEmpresa();
  const itens = itensDoPapel(membro.papel);
  return (
    <nav
      aria-label="Menu principal"
      className="sticky top-[67px] hidden h-[calc(100dvh-67px)] w-[76px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-borda bg-superficie px-2 py-4 md:flex lg:w-58 lg:px-3 lg:py-5"
    >
      {itens.map((item) => {
        const ativo = itemAtivo(caminho, empresa.slug, item.rota);
        return (
          <Link
            key={item.rota}
            href={`/${empresa.slug}/${item.rota}`}
            aria-current={ativo ? "page" : undefined}
            title={item.rotulo}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] text-neutro transition-colors hover:bg-fundo lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-[15px]",
              ativo && "bg-primaria-suave font-semibold text-primaria-hover hover:bg-primaria-suave",
            )}
          >
            <item.icone className="size-5 shrink-0" aria-hidden />
            <span className="lg:hidden">{item.curto}</span>
            <span className="hidden lg:inline">{item.rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
