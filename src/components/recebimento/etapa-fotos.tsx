"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOTOS_GERAIS_MINIMO } from "@/lib/validacoes/recebimento";
import { cn } from "@/lib/utils";
import { CapturaFoto } from "./captura-foto";
import { MiniaturaFoto } from "./miniatura-foto";
import type { FotoView } from "./use-fotos-os";

type EtapaFotosProps = {
  fotos: FotoView[];
  geraisGravadas: number;
  aoFotografar: (arquivos: File[]) => void;
  aoRetentarFoto: (tarefaId: string) => void;
  aoRemoverFoto: (foto: FotoView) => void;
  aoVoltar: () => void;
  aoAvancar: () => void;
};

/** Etapa 4: fotos gerais do motor (mínimo 3), com fila de upload visível. */
export function EtapaFotos({
  fotos,
  geraisGravadas,
  aoFotografar,
  aoRetentarFoto,
  aoRemoverFoto,
  aoVoltar,
  aoAvancar,
}: EtapaFotosProps) {
  const gerais = fotos.filter((f) => f.checklistItemId === null);
  const faltam = Math.max(0, FOTOS_GERAIS_MINIMO - geraisGravadas);
  const pendentesGerais = gerais.filter((f) => f.estado !== "enviado").length;

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold text-texto">Fotos gerais do motor</h2>
            <p className="mt-0.5 text-sm text-texto-secundario">
              Tire ao menos {FOTOS_GERAIS_MINIMO} fotos: visão geral, lado do cabeçote e
              plaqueta/gravação do motor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CapturaFoto
              variante="primario"
              texto="Tirar foto"
              rotulo="Tirar foto geral do motor"
              aoCapturar={aoFotografar}
            />
            <CapturaFoto
              variante="secundario"
              galeria
              texto="Da galeria"
              rotulo="Escolher fotos da galeria"
              aoCapturar={aoFotografar}
            />
          </div>
        </div>

        <p
          className={cn(
            "inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold",
            faltam === 0 ? "bg-sucesso-suave text-sucesso" : "bg-alerta-suave text-alerta",
          )}
          aria-live="polite"
        >
          {faltam === 0
            ? `${geraisGravadas} fotos gravadas`
            : `${geraisGravadas} de ${FOTOS_GERAIS_MINIMO} fotos mínimas gravadas`}
        </p>

        {gerais.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-borda-forte py-10 text-center text-texto-secundario">
            <ImagePlus className="size-8" aria-hidden />
            Toque em “Tirar foto” para abrir a câmera.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gerais.map((f) => (
              <li key={f.chave}>
                <MiniaturaFoto foto={f} aoRetentar={aoRetentarFoto} aoRemover={aoRemoverFoto} />
              </li>
            ))}
          </ul>
        )}
        {pendentesGerais > 0 && (
          <p className="text-sm text-texto-secundario">
            Fotos com envio pendente continuam tentando sozinhas quando a conexão voltar. Não feche
            esta tela até todas ficarem verdes.
          </p>
        )}
      </section>

      <footer className="sticky bottom-[76px] z-30 flex items-center justify-between gap-3 rounded-xl border border-borda bg-superficie px-4 py-3 shadow-sm md:bottom-3 lg:px-6">
        <Button
          type="button"
          variant="secondary"
          size="bancada"
          className="h-[52px]"
          onClick={aoVoltar}
        >
          <ChevronLeft aria-hidden />
          Checklist
        </Button>
        <Button
          type="button"
          size="bancada"
          className="h-[52px] rounded-xl"
          onClick={aoAvancar}
          disabled={faltam > 0}
        >
          Próximo: assinatura
          <ChevronRight aria-hidden />
        </Button>
      </footer>
    </div>
  );
}
