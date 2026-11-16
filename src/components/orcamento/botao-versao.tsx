"use client";

import * as React from "react";
import { FilePlus2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { criarVersaoAction } from "@/app/(app)/[empresa]/os/[id]/orcamento/actions";

/** Inicia o orçamento ou cria nova versão (copia os itens da anterior). */
export function BotaoVersao({
  slug,
  osId,
  rotulo,
  variante = "default",
  confirmar,
}: {
  slug: string;
  osId: string;
  rotulo: string;
  variante?: "default" | "secondary";
  confirmar?: string;
}) {
  const [pendente, iniciar] = React.useTransition();
  return (
    <Button
      type="button"
      variant={variante}
      disabled={pendente}
      onClick={() => {
        if (confirmar && !window.confirm(confirmar)) return;
        iniciar(async () => {
          const r = await criarVersaoAction(slug, osId);
          if (r.ok) toast.success(`Versão ${r.dados.versao} em rascunho.`);
          else toast.error(r.erro);
        });
      }}
    >
      {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <FilePlus2 aria-hidden />}
      {rotulo}
    </Button>
  );
}
