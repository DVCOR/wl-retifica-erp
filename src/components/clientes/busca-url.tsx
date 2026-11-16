"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  /** Nome do parâmetro da URL (padrão "q"). */
  param?: string;
  placeholder: string;
  rotulo: string;
  className?: string;
};

/** Campo de busca que grava o termo na URL (com atraso), reiniciando a paginação. */
export function BuscaUrl({ param = "q", placeholder, rotulo, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const atual = searchParams.get(param) ?? "";
  const [valor, setValor] = React.useState(atual);
  const [, startTransition] = React.useTransition();

  // Mantém o campo em sincronia quando a URL muda por fora (ex.: limpar filtros).
  const [anterior, setAnterior] = React.useState(atual);
  if (atual !== anterior) {
    setAnterior(atual);
    if (atual !== valor.trim()) setValor(atual);
  }

  React.useEffect(() => {
    if (valor.trim() === atual.trim()) return;
    const t = setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      if (valor.trim()) sp.set(param, valor.trim());
      else sp.delete(param);
      sp.delete("pagina");
      const qs = sp.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    }, 350);
    return () => clearTimeout(t);
  }, [valor, atual, param, pathname, router, searchParams]);

  return (
    <div className={className}>
      <label className="relative block">
        <span className="sr-only">{rotulo}</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-texto-secundario"
          aria-hidden
        />
        <Input
          type="search"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
          autoComplete="off"
        />
      </label>
    </div>
  );
}
