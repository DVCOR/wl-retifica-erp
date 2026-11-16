"use client";

import * as React from "react";
import { Minus, Plus, RotateCw } from "lucide-react";
import { SEGMENTOS_CHECKLIST, SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import type { ItemChecklist, StatusItem } from "@/lib/recebimento/divergencias";
import { cn } from "@/lib/utils";
import { CapturaFoto } from "./captura-foto";
import { MiniaturaFoto } from "./miniatura-foto";
import type { EstadoSalvar, PatchItem } from "./use-checklist";
import type { FotoView } from "./use-fotos-os";

type ItemChecklistLinhaProps = {
  item: ItemChecklist;
  estadoSalvar?: EstadoSalvar;
  fotos: FotoView[];
  aoAtualizar: (patch: PatchItem) => void;
  aoTentarDeNovo: () => void;
  aoFotografar: (arquivos: File[]) => void;
  aoRetentarFoto: (tarefaId: string) => void;
  aoRemoverFoto: (foto: FotoView) => void;
};

/** Uma linha do checklist: nome, quantidade, OK/Danificado/Ausente/N/A, observação e foto. */
export function ItemChecklistLinha({
  item,
  estadoSalvar,
  fotos,
  aoAtualizar,
  aoTentarDeNovo,
  aoFotografar,
  aoRetentarFoto,
  aoRemoverFoto,
}: ItemChecklistLinhaProps) {
  const diverge = item.status === "danificado" || item.status === "ausente";
  const [obsAberta, setObsAberta] = React.useState(false);
  const [obs, setObs] = React.useState(item.observacao ?? "");
  const mostrarObs = obsAberta || diverge || Boolean(item.observacao);
  const quantidade = item.quantidade ?? 0;

  function mudarQuantidade(nova: number) {
    const valor = Math.max(0, Math.min(9999, Math.round(nova)));
    aoAtualizar({ quantidade: valor });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-superficie px-3.5 py-3",
        diverge ? "border-alerta/60" : "border-borda",
        item.status === "na" && "opacity-75",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <span className="text-base font-semibold text-texto">{item.descricao}</span>
          {item.exige_quantidade && item.status !== "na" && (
            <div className="flex items-center gap-2 text-[13px] text-texto-secundario">
              Quantidade
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Diminuir quantidade de ${item.descricao}`}
                  onClick={() => mudarQuantidade(quantidade - 1)}
                  className="inline-flex size-12 items-center justify-center rounded-[10px] border border-borda-forte bg-superficie text-texto hover:bg-fundo"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={`Quantidade de ${item.descricao}`}
                  value={item.quantidade ?? ""}
                  onChange={(e) =>
                    e.target.value === ""
                      ? aoAtualizar({ quantidade: null })
                      : mudarQuantidade(Number(e.target.value))
                  }
                  className="h-12 w-16 rounded-[10px] border border-borda-forte bg-superficie text-center text-base font-bold text-texto"
                />
                <button
                  type="button"
                  aria-label={`Aumentar quantidade de ${item.descricao}`}
                  onClick={() => mudarQuantidade(quantidade + 1)}
                  className="inline-flex size-12 items-center justify-center rounded-[10px] border border-borda-forte bg-superficie text-texto hover:bg-fundo"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>

        <SegmentedControl<StatusItem>
          segmentos={SEGMENTOS_CHECKLIST}
          valor={item.status}
          onValorChange={(status) => aoAtualizar({ status })}
          rotulo={`Estado do item ${item.descricao}`}
          tamanho="bancada"
          className="w-full min-w-72 sm:w-96"
        />

        <CapturaFoto
          rotulo={`Tirar foto de ${item.descricao}`}
          quantidade={fotos.length}
          aoCapturar={aoFotografar}
        />
      </div>

      {(fotos.length > 0 || mostrarObs || estadoSalvar === "erro") && (
        <div className="flex flex-col gap-2">
          {fotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fotos.map((f) => (
                <MiniaturaFoto
                  key={f.chave}
                  foto={f}
                  tamanho="sm"
                  aoRetentar={aoRetentarFoto}
                  aoRemover={aoRemoverFoto}
                />
              ))}
            </div>
          )}
          {mostrarObs && (
            <Textarea
              aria-label={`Observação sobre ${item.descricao}`}
              placeholder={diverge ? "Descreva a avaria ou o que falta" : "Observação (opcional)"}
              value={obs}
              rows={2}
              className="min-h-14"
              onChange={(e) => setObs(e.target.value)}
              onBlur={() => {
                const limpo = obs.trim();
                if (limpo !== (item.observacao ?? "")) aoAtualizar({ observacao: limpo });
              }}
            />
          )}
          {estadoSalvar === "erro" && (
            <button
              type="button"
              onClick={aoTentarDeNovo}
              className="inline-flex h-12 w-fit items-center gap-2 rounded-[10px] bg-perigo-suave px-4 text-sm font-semibold text-perigo"
            >
              <RotateCw className="size-4" aria-hidden />
              Não salvou. Tentar de novo
            </button>
          )}
        </div>
      )}

      {!mostrarObs && (
        <button
          type="button"
          onClick={() => setObsAberta(true)}
          className="-mt-1 inline-flex h-11 w-fit items-center rounded-lg px-1 text-sm font-medium text-texto-secundario underline-offset-4 hover:text-texto hover:underline"
        >
          Adicionar observação
        </button>
      )}
    </div>
  );
}
