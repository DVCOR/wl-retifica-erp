"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useEmpresa } from "@/lib/auth/empresa-context";
import type { ClienteCompleto, TabelaPrecoOpcao } from "@/lib/data/clientes";
import { FormCliente } from "./form-cliente";

type Props = {
  /** Botão/elemento que abre a gaveta. */
  children: React.ReactNode;
  inicial?: ClienteCompleto;
  tabelas: TabelaPrecoOpcao[];
  /** Depois de criar, abre a ficha (padrão: true). */
  irParaFicha?: boolean;
};

/** Gaveta lateral (tela cheia no celular) com o formulário de cliente. */
export function ClienteSheet({ children, inicial, tabelas, irParaFicha = !inicial }: Props) {
  const [aberto, setAberto] = React.useState(false);
  const router = useRouter();
  const { empresa } = useEmpresa();

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full max-w-none overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{inicial ? "Editar cliente" : "Novo cliente"}</SheetTitle>
          <SheetDescription>
            {inicial
              ? "Altere os dados e salve."
              : "Preencha o essencial; o resto pode ficar para depois."}
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 pb-8">
          {aberto && (
            <FormCliente
              key={inicial?.updated_at ?? "novo"}
              inicial={inicial}
              tabelas={tabelas}
              onCancelar={() => setAberto(false)}
              onSalvo={(id) => {
                setAberto(false);
                if (irParaFicha) router.push(`/${empresa.slug}/clientes/${id}`);
                else router.refresh();
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
