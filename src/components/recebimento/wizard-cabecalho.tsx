import * as React from "react";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETAPAS, indiceEtapa, type EtapaId } from "./etapas";

type WizardCabecalhoProps = {
  titulo: string;
  subtitulo?: React.ReactNode;
  voltarHref: string;
  etapaAtual: EtapaId;
  /** Quando informado, etapas anteriores viram botões (voltar para corrigir). */
  aoIrParaEtapa?: (etapa: EtapaId) => void;
  /** Etapas que podem ser reabertas pelo indicador. */
  etapasNavegaveis?: readonly EtapaId[];
};

/** Cabeçalho do wizard da Nova OS: voltar, título, resumo e indicador de etapas. */
export function WizardCabecalho({
  titulo,
  subtitulo,
  voltarHref,
  etapaAtual,
  aoIrParaEtapa,
  etapasNavegaveis = [],
}: WizardCabecalhoProps) {
  const atual = indiceEtapa(etapaAtual);
  return (
    <header className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie px-4 py-3 lg:flex-row lg:items-center lg:gap-4 lg:px-6 lg:py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={voltarHref}
          aria-label="Voltar"
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-borda-forte text-texto hover:bg-fundo"
        >
          <ChevronLeft className="size-[22px]" aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-lg font-bold text-texto lg:text-xl">{titulo}</h1>
          {subtitulo && <div className="text-sm text-texto-secundario">{subtitulo}</div>}
        </div>
      </div>
      <ol aria-label="Etapas" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0">
        {ETAPAS.map((etapa, i) => {
          const concluida = i < atual;
          const ativa = i === atual;
          const navegavel = concluida && aoIrParaEtapa && etapasNavegaveis.includes(etapa.id);
          const conteudo = (
            <>
              {concluida && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
              {concluida ? etapa.rotulo : `${i + 1} ${etapa.rotulo}`}
            </>
          );
          const classe = cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap",
            concluida && "bg-sucesso-suave text-sucesso",
            ativa && "bg-primaria text-white",
            !concluida && !ativa && "bg-neutro-suave font-medium text-texto-secundario",
          );
          return (
            <li key={etapa.id} aria-current={ativa ? "step" : undefined}>
              {navegavel ? (
                <button
                  type="button"
                  onClick={() => aoIrParaEtapa(etapa.id)}
                  className={cn(classe, "min-h-10 hover:brightness-95")}
                >
                  {conteudo}
                </button>
              ) : (
                <span className={classe}>{conteudo}</span>
              )}
            </li>
          );
        })}
      </ol>
    </header>
  );
}
