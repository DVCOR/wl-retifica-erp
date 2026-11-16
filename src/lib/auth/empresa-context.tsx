"use client";

import * as React from "react";
import type { ContextoEmpresa } from "./sessao";
import { pode, podeVerPrecos, type Acao } from "./permissoes";

const EmpresaContext = React.createContext<ContextoEmpresa | null>(null);

/** Fornecido pelo layout src/app/(app)/[empresa]/layout.tsx. */
export function EmpresaProvider({ valor, children }: { valor: ContextoEmpresa; children: React.ReactNode }) {
  return <EmpresaContext value={valor}>{children}</EmpresaContext>;
}

/** Empresa ativa, membro (papel) e config — em componentes cliente. */
export function useEmpresa(): ContextoEmpresa {
  const ctx = React.use(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa precisa estar dentro de <EmpresaProvider>");
  return ctx;
}

/** Atalhos de permissão para componentes cliente. */
export function usePermissao() {
  const { membro, empresa } = useEmpresa();
  return {
    papel: membro.papel,
    pode: (acao: Acao) => pode(membro.papel, acao),
    vePrecos: podeVerPrecos(membro.papel, empresa.config),
  };
}
