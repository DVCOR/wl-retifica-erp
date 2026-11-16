"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trocarTecnicoAction } from "@/app/(app)/[empresa]/os/actions";

type Props = {
  slug: string;
  osId: string;
  atual: string | null;
  opcoes: { id: string; nome: string }[];
};

export function TrocaTecnico({ slug, osId, atual, opcoes }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = React.useTransition();
  return (
    <Select
      value={atual ?? "nenhum"}
      disabled={pendente}
      onValueChange={(v) =>
        iniciar(async () => {
          const r = await trocarTecnicoAction(slug, osId, { tecnico_id: v === "nenhum" ? null : v });
          if (!r.ok) toast.error(r.erro);
          else toast.success("Responsável atualizado.");
          router.refresh();
        })
      }
    >
      <SelectTrigger className="w-56" aria-label="Técnico responsável">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="nenhum">Sem técnico</SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
