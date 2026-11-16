"use client";

import { AlertTriangle, Check, Loader2, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FotoView } from "./use-fotos-os";

const ROTULO_ESTADO: Record<FotoView["estado"], string> = {
  na_fila: "Na fila",
  enviando: "Enviando…",
  aguardando_retentativa: "Sem rede, tentando de novo",
  falhou: "Falhou. Toque para tentar de novo",
  enviado: "Enviada",
};

type MiniaturaFotoProps = {
  foto: FotoView;
  tamanho?: "sm" | "lg";
  aoRetentar: (tarefaId: string) => void;
  aoRemover: (foto: FotoView) => void;
};

/** Miniatura com o estado do envio visível (SPEC 10.5). */
export function MiniaturaFoto({ foto, tamanho = "lg", aoRetentar, aoRemover }: MiniaturaFotoProps) {
  const falhou = foto.estado === "falhou";
  const esperando = foto.estado === "aguardando_retentativa";
  const emAndamento = foto.estado === "enviando" || foto.estado === "na_fila";
  const lg = tamanho === "lg";

  function aoToque() {
    if (foto.tarefaId && (falhou || esperando)) {
      aoRetentar(foto.tarefaId);
      return;
    }
    if (window.confirm("Remover esta foto?")) aoRemover(foto);
  }

  return (
    <div className={cn("flex flex-col gap-1", lg ? "w-full" : "w-12")}>
      <button
        type="button"
        onClick={aoToque}
        aria-label={`Foto: ${ROTULO_ESTADO[foto.estado]}. Toque para ${falhou || esperando ? "tentar de novo" : "remover"}`}
        className={cn(
          "relative block overflow-hidden rounded-lg border-2 bg-neutro-suave",
          lg ? "aspect-[4/3] w-full" : "size-12",
          falhou ? "border-perigo" : esperando ? "border-alerta" : "border-borda",
        )}
      >
        {foto.url && (
          // eslint-disable-next-line @next/next/no-img-element -- blob/URL assinada; sem otimização do Next
          <img src={foto.url} alt="" className="size-full object-cover" />
        )}
        <span
          className={cn(
            "absolute flex items-center justify-center rounded-full text-white",
            lg ? "right-1.5 bottom-1.5 size-7" : "right-0.5 bottom-0.5 size-5",
            falhou ? "bg-perigo" : esperando ? "bg-alerta" : emAndamento ? "bg-info" : "bg-sucesso",
          )}
        >
          {falhou ? (
            <AlertTriangle className="size-3.5" aria-hidden />
          ) : esperando ? (
            <WifiOff className="size-3.5" aria-hidden />
          ) : emAndamento ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          )}
        </span>
        {!lg && <span className="sr-only">{ROTULO_ESTADO[foto.estado]}</span>}
      </button>
      {lg && (
        <div className="flex min-h-5 items-center justify-between gap-1 text-xs">
          <span
            className={cn(
              "font-medium",
              falhou ? "text-perigo" : esperando ? "text-alerta" : "text-texto-secundario",
            )}
          >
            {ROTULO_ESTADO[foto.estado]}
          </span>
          {foto.estado === "enviado" && (
            <button
              type="button"
              onClick={() => aoToque()}
              aria-label="Remover foto"
              className="-m-2 inline-flex size-11 items-center justify-center text-texto-secundario hover:text-perigo"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
