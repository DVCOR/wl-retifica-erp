"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormErro } from "@/components/ui/form";
import { toast } from "@/components/ui/sonner";
import { useEmpresa } from "@/lib/auth/empresa-context";
import { alterarSituacaoCliente } from "@/app/(app)/[empresa]/clientes/actions";

/** Ativar/inativar cliente (inativar pede confirmação). */
export function BotaoSituacaoCliente({
  id,
  nome,
  ativo,
}: {
  id: string;
  nome: string;
  ativo: boolean;
}) {
  const { empresa } = useEmpresa();
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();

  const alterar = (novo: boolean) =>
    startTransition(async () => {
      setErro(null);
      const r = await alterarSituacaoCliente(empresa.slug, id, novo);
      if (r.ok) {
        toast.success(novo ? "Cliente reativado" : "Cliente inativado");
        setAberto(false);
        router.refresh();
      } else {
        setErro(r.erro);
      }
    });

  if (!ativo) {
    return (
      <>
        <Button variant="outline" onClick={() => alterar(true)} disabled={pendente}>
          {pendente ? "Reativando…" : "Reativar"}
        </Button>
        {erro && <FormErro mensagem={erro} />}
      </>
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline">Inativar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inativar {nome}?</DialogTitle>
          <DialogDescription>
            O cliente deixa de aparecer nas buscas para novas OS. O histórico é mantido e você pode
            reativá-lo quando quiser.
          </DialogDescription>
        </DialogHeader>
        <FormErro mensagem={erro} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => alterar(false)} disabled={pendente}>
            {pendente ? "Inativando…" : "Inativar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
