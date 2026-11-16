import type * as React from "react";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { SidebarNav } from "./sidebar-nav";

/** Casca do app autenticado: topo, menu lateral (md+) e barra inferior (celular). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-fundo">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-superficie px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <AppHeader />
      <div className="flex flex-1">
        <SidebarNav />
        <main
          id="conteudo"
          className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10 lg:px-8 lg:pt-7"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
