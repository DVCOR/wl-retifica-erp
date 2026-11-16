"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatarDataHora } from "@/lib/format";
import { MARCA_CONCLUIDO, somarMs } from "@/lib/os/cronometro";
import type { ApontamentoView, ItemExecucao } from "@/lib/data/os";
import {
  concluirItemAction,
  iniciarApontamentoAction,
  pausarApontamentoAction,
} from "@/app/(app)/[empresa]/os/actions";
import { Cronometro } from "./cronometro";

type Props = {
  slug: string;
  osId: string;
  membroId: string;
  itens: ItemExecucao[];
  apontamentos: ApontamentoView[];
  podeApontar: boolean;
};

/** Aba Execução do detalhe: iniciar/pausar/concluir cada serviço aprovado. */
export function ExecucaoOs({ slug, osId, membroId, itens, apontamentos, podeApontar }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = React.useTransition();
  const [agora] = React.useState(() => Date.now());

  function executar(fn: () => Promise<{ ok: boolean; erro?: string }>) {
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.erro ?? "Não foi possível concluir.");
      router.refresh();
    });
  }

  const abertoDoMembro = apontamentos.find((a) => a.fim === null && a.membro_id === membroId);

  return (
    <div className="flex flex-col gap-4">
      {itens.length === 0 ? (
        <EmptyState
          titulo="Nenhum serviço aprovado"
          descricao="Os serviços aparecem aqui depois que o orçamento for aprovado."
        />
      ) : (
        <ul className="divide-y divide-borda rounded-xl border border-borda bg-superficie">
          {itens.map((i) => {
            const doItem = apontamentos.filter(
              (a) => a.orcamento_item_id === i.id && a.observacao !== MARCA_CONCLUIDO,
            );
            const aberto = doItem.find((a) => a.fim === null && a.membro_id === membroId);
            const fechadosMs = somarMs(doItem.filter((a) => a.fim !== null), agora);
            return (
              <li key={i.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className={i.concluido ? "font-medium text-texto-secundario line-through" : "font-medium"}>
                    {i.descricao}
                    {i.quantidade !== 1 && <span className="text-texto-secundario"> ({i.quantidade})</span>}
                  </div>
                  <div className="font-mono text-sm text-texto-secundario">
                    <Cronometro baseMs={fechadosMs} desde={aberto?.inicio ?? null} />
                  </div>
                </div>
                {podeApontar && !i.concluido && (
                  <div className="flex gap-2">
                    {aberto ? (
                      <Button
                        variant="escuro"
                        disabled={pendente}
                        onClick={() => executar(() => pausarApontamentoAction(slug, osId, aberto.id))}
                      >
                        <Pause aria-hidden /> Pausar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={pendente}
                        onClick={() =>
                          executar(() => iniciarApontamentoAction(slug, osId, { orcamento_item_id: i.id }))
                        }
                      >
                        <Play aria-hidden /> Iniciar
                      </Button>
                    )}
                    <Button
                      disabled={pendente}
                      onClick={() =>
                        executar(() =>
                          concluirItemAction(slug, osId, { orcamento_item_id: i.id, concluido: true }),
                        )
                      }
                    >
                      <Check aria-hidden /> Concluir
                    </Button>
                  </div>
                )}
                {podeApontar && i.concluido && (
                  <Button
                    variant="ghost"
                    disabled={pendente}
                    onClick={() =>
                      executar(() =>
                        concluirItemAction(slug, osId, { orcamento_item_id: i.id, concluido: false }),
                      )
                    }
                  >
                    Reabrir
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {podeApontar && !abertoDoMembro && itens.length > 0 && (
        <p className="text-sm text-texto-secundario">Nenhum serviço em andamento por você.</p>
      )}

      <section aria-label="Apontamentos">
        <h3 className="mb-2 text-base font-semibold">Apontamentos</h3>
        {apontamentos.filter((a) => a.observacao !== MARCA_CONCLUIDO).length === 0 ? (
          <p className="text-sm text-texto-secundario">Nenhum tempo apontado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {apontamentos
              .filter((a) => a.observacao !== MARCA_CONCLUIDO)
              .map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-superficie px-3 py-2">
                  <span>
                    {a.membro_nome ?? "—"} ·{" "}
                    {itens.find((i) => i.id === a.orcamento_item_id)?.descricao ?? "Serviço avulso"}
                  </span>
                  <span className="text-texto-secundario">
                    {formatarDataHora(a.inicio)} {a.fim ? `· ${a.minutos ?? 0} min` : "· em andamento"}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
