"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { textoDeValor, valorDeTexto } from "@/lib/catalogo/moeda";
import { cn } from "@/lib/utils";

type CampoMoedaProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange" | "type" | "inputMode"
> & {
  /** Valor em reais (12.5 = R$ 12,50); null = vazio. */
  valor: number | null;
  onValorChange: (valor: number | null) => void;
};

/**
 * Campo de valor em BRL com máscara "por centavos": digitar "1250" mostra
 * "12,50"; "125000" mostra "1.250,00". Aceita só dígitos (teclado numérico no
 * celular), backspace apaga o último dígito. Padrão único do módulo Catálogo.
 */
export function CampoMoeda({
  valor,
  onValorChange,
  className,
  placeholder,
  ...props
}: CampoMoedaProps) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[15px] text-texto-secundario"
      >
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder ?? "0,00"}
        value={textoDeValor(valor)}
        onChange={(e) => onValorChange(valorDeTexto(e.target.value))}
        className={cn("pl-10 text-right tabular-nums", className)}
      />
    </div>
  );
}
