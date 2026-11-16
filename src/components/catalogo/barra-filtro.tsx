"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type BarraFiltroProps = {
  busca: string;
  onBuscaChange: (valor: string) => void;
  rotulo: string;
  placeholder: string;
  mostrarInativos: boolean;
  onMostrarInativosChange: (valor: boolean) => void;
};

/** Busca + "mostrar inativos", usada nas listas do catálogo. */
export function BarraFiltro({
  busca,
  onBuscaChange,
  rotulo,
  placeholder,
  mostrarInativos,
  onMostrarInativosChange,
}: BarraFiltroProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-texto-secundario"
          aria-hidden
        />
        <Input
          type="search"
          aria-label={rotulo}
          placeholder={placeholder}
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] text-texto-secundario select-none">
        <input
          type="checkbox"
          checked={mostrarInativos}
          onChange={(e) => onMostrarInativosChange(e.target.checked)}
          className="size-5 accent-primaria"
        />
        Mostrar inativos
      </label>
    </div>
  );
}

/** Normaliza para busca sem acento e sem caixa. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
