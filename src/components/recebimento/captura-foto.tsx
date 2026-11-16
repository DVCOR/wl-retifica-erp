"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type CapturaFotoProps = {
  rotulo: string;
  /** Recebe os arquivos escolhidos/tirados. */
  aoCapturar: (arquivos: File[]) => void;
  /** Número exibido na bolinha (fotos do item). */
  quantidade?: number;
  /** Botão com texto (etapa de fotos) em vez de só o ícone. */
  texto?: string;
  /** Permite escolher da galeria em vez de abrir a câmera. */
  galeria?: boolean;
  variante?: "icone" | "primario" | "secundario";
  className?: string;
};

/**
 * Botão de câmera: abre a câmera traseira do aparelho direto
 * (`capture="environment"`). Com `galeria`, abre o seletor de arquivos.
 */
export function CapturaFoto({
  rotulo,
  aoCapturar,
  quantidade = 0,
  texto,
  galeria = false,
  variante = "icone",
  className,
}: CapturaFotoProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        {...(galeria ? { multiple: true } : { capture: "environment" })}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const arquivos = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (arquivos.length > 0) aoCapturar(arquivos);
        }}
      />
      <button
        type="button"
        aria-label={rotulo}
        onClick={() => ref.current?.click()}
        className={cn(
          "relative inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold transition-colors",
          variante === "icone" &&
            "w-12 border border-borda-forte bg-superficie text-neutro hover:bg-fundo",
          variante === "primario" && "bg-primaria px-5 text-white hover:bg-primaria-hover",
          variante === "secundario" &&
            "border border-borda-forte bg-superficie px-5 text-texto hover:bg-fundo",
          className,
        )}
      >
        <Camera className="size-[22px]" aria-hidden />
        {texto}
        {variante === "icone" && quantidade > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-[22px] items-center justify-center rounded-full bg-primaria text-xs font-bold text-white">
            {quantidade}
          </span>
        )}
      </button>
    </>
  );
}
