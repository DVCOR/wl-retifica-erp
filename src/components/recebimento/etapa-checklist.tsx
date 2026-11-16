"use client";

import * as React from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  agruparPorGrupo,
  contarDivergencias,
  type ItemChecklist,
} from "@/lib/recebimento/divergencias";
import { cn } from "@/lib/utils";
import { ItemChecklistLinha } from "./item-checklist";
import type { EstadoSalvar, PatchItem } from "./use-checklist";
import type { FotoView } from "./use-fotos-os";

type EtapaChecklistProps = {
  itens: ItemChecklist[];
  salvar: Record<string, EstadoSalvar>;
  fotos: FotoView[];
  avancando: boolean;
  aoAtualizar: (itemId: string, patch: PatchItem) => void;
  aoTentarDeNovo: (itemId: string) => void;
  aoMarcarGrupo: (grupo: string, status: "na" | "ok") => void;
  aoFotografar: (itemId: string, arquivos: File[]) => void;
  aoRetentarFoto: (tarefaId: string) => void;
  aoRemoverFoto: (foto: FotoView) => void;
  aoAvancar: () => void;
};

/** Etapa 3: grupos à esquerda, itens à direita, contador de divergências no rodapé. */
export function EtapaChecklist({
  itens,
  salvar,
  fotos,
  avancando,
  aoAtualizar,
  aoTentarDeNovo,
  aoMarcarGrupo,
  aoFotografar,
  aoRetentarFoto,
  aoRemoverFoto,
  aoAvancar,
}: EtapaChecklistProps) {
  const grupos = agruparPorGrupo(itens);
  const [indice, setIndice] = React.useState(0);
  const atual = grupos[Math.min(indice, grupos.length - 1)];
  const total = contarDivergencias(itens);
  const comErro = Object.values(salvar).filter((s) => s === "erro").length;
  const salvando = Object.values(salvar).filter((s) => s === "salvando").length;

  if (!atual) {
    return (
      <div className="rounded-xl border border-borda bg-superficie p-6 text-texto-secundario">
        Esta OS não tem itens de checklist. Verifique o template padrão em Configurações.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col overflow-hidden rounded-xl border border-borda bg-superficie md:flex-row">
        <nav
          aria-label="Grupos do checklist"
          className="flex gap-1.5 overflow-x-auto border-b border-borda p-3 md:w-72 md:shrink-0 md:flex-col md:overflow-y-auto md:border-r md:border-b-0 lg:w-[300px]"
        >
          {grupos.map((g, i) => {
            const ativo = i === indice;
            return (
              <button
                key={g.nome}
                type="button"
                onClick={() => setIndice(i)}
                aria-current={ativo ? "true" : undefined}
                className={cn(
                  "flex min-h-[60px] shrink-0 items-center justify-between gap-2 rounded-[10px] border-2 px-3 py-2 text-left",
                  ativo
                    ? "border-primaria bg-primaria-suave"
                    : "border-transparent bg-superficie hover:bg-fundo",
                )}
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span className="text-base font-semibold text-texto">{g.nome}</span>
                  <span className="text-[13px] text-texto-secundario">
                    {g.todoNa ? "Tudo N/A" : `${g.itens.length} itens`}
                  </span>
                </span>
                {g.divergencias > 0 && (
                  <span
                    className="inline-flex size-7 min-w-7 items-center justify-center rounded-full bg-perigo-suave text-[13px] font-bold text-perigo"
                    aria-label={`${g.divergencias} divergências`}
                  >
                    {g.divergencias}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <section
          aria-labelledby="titulo-grupo"
          className="flex min-w-0 flex-1 flex-col gap-3 p-4 md:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="titulo-grupo" className="text-[22px] font-bold text-texto">
                {atual.nome}
              </h2>
              <p className="mt-0.5 text-sm text-texto-secundario">
                Tudo começa como OK. Toque só no que estiver diferente.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="bancada"
              className="h-12 px-4 font-medium"
              onClick={() => aoMarcarGrupo(atual.nome, atual.todoNa ? "ok" : "na")}
            >
              {atual.todoNa ? "Desfazer N/A do grupo" : "Grupo inteiro N/A"}
            </Button>
          </div>

          {atual.itens.map((item) => (
            <ItemChecklistLinha
              key={item.id}
              item={item}
              estadoSalvar={salvar[item.id]}
              fotos={fotos.filter((f) => f.checklistItemId === item.id)}
              aoAtualizar={(patch) => aoAtualizar(item.id, patch)}
              aoTentarDeNovo={() => aoTentarDeNovo(item.id)}
              aoFotografar={(arquivos) => aoFotografar(item.id, arquivos)}
              aoRetentarFoto={aoRetentarFoto}
              aoRemoverFoto={aoRemoverFoto}
            />
          ))}
        </section>
      </div>

      <footer className="sticky bottom-[76px] z-30 flex flex-col gap-3 rounded-xl border border-borda bg-superficie px-4 py-3 shadow-sm sm:flex-row sm:items-center md:bottom-3 lg:px-6">
        <div className="flex-1 text-[15px] text-texto" aria-live="polite">
          <strong>{total}</strong>{" "}
          <span className="text-texto-secundario">
            divergência(s) registrada(s). Elas aparecem no resumo para o cliente assinar.
          </span>
          {salvando > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[13px] text-texto-secundario">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Salvando…
            </span>
          )}
          {comErro > 0 && (
            <span className="ml-2 text-[13px] font-semibold text-perigo">
              {comErro} item(ns) sem salvar
            </span>
          )}
        </div>
        <Button
          type="button"
          size="bancada"
          className="h-[52px] rounded-xl"
          onClick={aoAvancar}
          disabled={avancando || comErro > 0}
        >
          {avancando && <Loader2 className="animate-spin" aria-hidden />}
          Próximo: fotos
          <ChevronRight aria-hidden />
        </Button>
      </footer>
    </div>
  );
}
