"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export type SegmentoTom = "neutro" | "sucesso" | "alerta" | "perigo" | "info" | "primaria";

export type Segmento<V extends string> = {
  valor: V;
  rotulo: string;
  tom?: SegmentoTom;
  icone?: React.ReactNode;
};

const tomSelecionado: Record<SegmentoTom, string> = {
  neutro:
    "data-[state=checked]:bg-preto data-[state=checked]:text-white data-[state=checked]:border-preto",
  sucesso:
    "data-[state=checked]:bg-sucesso data-[state=checked]:text-white data-[state=checked]:border-sucesso",
  alerta:
    "data-[state=checked]:bg-alerta data-[state=checked]:text-white data-[state=checked]:border-alerta",
  perigo:
    "data-[state=checked]:bg-perigo data-[state=checked]:text-white data-[state=checked]:border-perigo",
  info: "data-[state=checked]:bg-info data-[state=checked]:text-white data-[state=checked]:border-info",
  primaria:
    "data-[state=checked]:bg-primaria data-[state=checked]:text-white data-[state=checked]:border-primaria",
};

type SegmentedControlProps<V extends string> = {
  segmentos: readonly Segmento<V>[];
  valor: V;
  onValorChange: (valor: V) => void;
  /** Nome acessível do grupo, ex.: "Estado do item Face do cabeçote". */
  rotulo: string;
  tamanho?: "default" | "bancada";
  disabled?: boolean;
  className?: string;
};

/**
 * Controle segmentado (rádio acessível). Uso típico no checklist:
 * OK / Danificado / Ausente / N/A — ver SEGMENTOS_CHECKLIST.
 * Teclado: setas mudam a opção.
 */
function SegmentedControl<V extends string>({
  segmentos,
  valor,
  onValorChange,
  rotulo,
  tamanho = "default",
  disabled,
  className,
}: SegmentedControlProps<V>) {
  return (
    <RadioGroupPrimitive.Root
      aria-label={rotulo}
      value={valor}
      onValueChange={(v) => onValorChange(v as V)}
      disabled={disabled}
      orientation="horizontal"
      className={cn(
        "inline-flex w-full gap-1 rounded-lg border border-borda bg-neutro-suave/50 p-1",
        className,
      )}
    >
      {segmentos.map((s) => (
        <RadioGroupPrimitive.Item
          key={s.valor}
          value={s.valor}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 text-sm font-semibold text-texto-secundario transition-colors hover:bg-superficie hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primaria disabled:opacity-50",
            tamanho === "bancada" ? "min-h-12 text-base" : "min-h-11",
            tomSelecionado[s.tom ?? "neutro"],
          )}
        >
          {s.icone}
          {s.rotulo}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

/** Opções padrão do item de checklist (enum checklist_status). */
export const SEGMENTOS_CHECKLIST = [
  { valor: "ok", rotulo: "OK", tom: "sucesso" },
  { valor: "danificado", rotulo: "Danificado", tom: "perigo" },
  { valor: "ausente", rotulo: "Ausente", tom: "alerta" },
  { valor: "na", rotulo: "N/A", tom: "neutro" },
] as const satisfies readonly Segmento<"ok" | "danificado" | "ausente" | "na">[];

export { SegmentedControl };
