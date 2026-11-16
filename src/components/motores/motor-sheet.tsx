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
import type { MotorCompleto } from "@/lib/data/motores";
import { FormMotor } from "./form-motor";

type Props = {
  children: React.ReactNode;
  inicial?: MotorCompleto & { cliente?: { id: string; nome: string } | null };
  cliente?: { id: string; nome: string } | null;
  clienteFixo?: boolean;
};

/** Gaveta lateral com o formulário de motor (novo ou edição). */
export function MotorSheet({ children, inicial, cliente, clienteFixo }: Props) {
  const [aberto, setAberto] = React.useState(false);
  const router = useRouter();
  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full max-w-none overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{inicial ? "Editar motor" : "Novo motor"}</SheetTitle>
          <SheetDescription>
            Código e nº de série ligam o motor ao histórico, mesmo vindo de clientes diferentes.
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 pb-8">
          {aberto && (
            <FormMotor
              key={inicial?.updated_at ?? "novo"}
              inicial={inicial}
              cliente={cliente}
              clienteFixo={clienteFixo}
              onCancelar={() => setAberto(false)}
              onSalvo={() => {
                setAberto(false);
                router.refresh();
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
