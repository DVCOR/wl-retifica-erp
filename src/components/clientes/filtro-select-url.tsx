"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  param: string;
  rotulo: string;
  opcoes: readonly { valor: string; rotulo: string }[];
  /** Valor que significa "sem filtro" (removido da URL). */
  padrao: string;
  className?: string;
};

/** Lista de seleção nativa (ótima no celular) que grava o filtro na URL. */
export function FiltroSelectUrl({ param, rotulo, opcoes, padrao, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const atual = searchParams.get(param) ?? padrao;
  const [, startTransition] = React.useTransition();

  return (
    <label className={cn("block", className)}>
      <span className="sr-only">{rotulo}</span>
      <select
        value={atual}
        onChange={(e) => {
          const sp = new URLSearchParams(searchParams.toString());
          if (e.target.value === padrao) sp.delete(param);
          else sp.set(param, e.target.value);
          sp.delete("pagina");
          const qs = sp.toString();
          startTransition(() =>
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
          );
        }}
        className="h-11 w-full rounded-lg border border-input bg-superficie px-3 text-[15px] text-texto focus-visible:border-primaria focus-visible:outline-2 focus-visible:outline-primaria/30"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
