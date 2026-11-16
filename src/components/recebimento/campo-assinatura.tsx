"use client";

import * as React from "react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

export type CampoAssinaturaHandle = {
  limpar: () => void;
  estaVazio: () => boolean;
  /** PNG com fundo transparente. */
  paraBlob: () => Promise<Blob>;
};

type Ponto = { x: number; y: number };

type CampoAssinaturaProps = {
  ref?: React.Ref<CampoAssinaturaHandle>;
  aoMudar?: (vazio: boolean) => void;
  className?: string;
};

/**
 * Quadro de assinatura em canvas (dedo, caneta ou mouse). Guarda os traços em
 * coordenadas relativas, então redesenha ao girar o tablet sem perder a assinatura.
 */
export function CampoAssinatura({ ref, aoMudar, className }: CampoAssinaturaProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const tracos = React.useRef<Ponto[][]>([]);
  const tracoAtual = React.useRef<Ponto[] | null>(null);
  const [vazio, setVazio] = React.useState(true);

  const desenhar = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = getComputedStyle(canvas).color; // cor do tema (text-preto)
    ctx.lineWidth = Math.max(2, width / 300) * (window.devicePixelRatio || 1) * 0.9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const traco of tracos.current) {
      if (traco.length === 0) continue;
      ctx.beginPath();
      const [p0, ...resto] = traco;
      ctx.moveTo(p0.x * width, p0.y * height);
      if (resto.length === 0) ctx.lineTo(p0.x * width + 0.1, p0.y * height);
      for (const p of resto) ctx.lineTo(p.x * width, p.y * height);
      ctx.stroke();
    }
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ajustar = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhar();
    };
    ajustar();
    const obs = new ResizeObserver(ajustar);
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [desenhar]);

  const mudou = React.useCallback(
    (novoVazio: boolean) => {
      setVazio(novoVazio);
      aoMudar?.(novoVazio);
    },
    [aoMudar],
  );

  const limpar = React.useCallback(() => {
    tracos.current = [];
    tracoAtual.current = null;
    desenhar();
    mudou(true);
  }, [desenhar, mudou]);

  React.useImperativeHandle(
    ref,
    () => ({
      limpar,
      estaVazio: () => tracos.current.length === 0,
      paraBlob: () =>
        new Promise<Blob>((resolve, reject) => {
          const canvas = canvasRef.current;
          if (!canvas) return reject(new Error("Quadro de assinatura indisponível"));
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a assinatura"))),
            "image/png",
          );
        }),
    }),
    [limpar],
  );

  function ponto(e: React.PointerEvent<HTMLCanvasElement>): Ponto {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Quadro de assinatura. Assine com o dedo ou a caneta."
          className="h-56 w-full touch-none rounded-xl border-2 border-dashed border-borda-forte bg-superficie text-preto md:h-64"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const novo = [ponto(e)];
            tracoAtual.current = novo;
            tracos.current.push(novo);
            desenhar();
            if (vazio) mudou(false);
          }}
          onPointerMove={(e) => {
            if (!tracoAtual.current) return;
            tracoAtual.current.push(ponto(e));
            desenhar();
          }}
          onPointerUp={() => {
            tracoAtual.current = null;
          }}
          onPointerCancel={() => {
            tracoAtual.current = null;
          }}
        />
        {vazio && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-base text-texto-secundario/70">
            Assine aqui
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={limpar}
        disabled={vazio}
        className="inline-flex h-12 w-fit items-center gap-2 rounded-[10px] border border-borda-forte px-4 text-[15px] font-medium text-texto hover:bg-fundo disabled:opacity-50"
      >
        <Eraser className="size-[18px]" aria-hidden />
        Limpar assinatura
      </button>
    </div>
  );
}
