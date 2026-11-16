"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/app/status-badge";
import { formatarPlaca } from "@/lib/format";
import { estaAtrasada, rotuloPrazo, type CartaoOs } from "@/lib/os/quadro";
import { STATUS_OS } from "@/lib/os/status";
import { cn } from "@/lib/utils";
import type { OsStatus } from "@/lib/auth/permissoes";

export function iniciais(nome: string | null): string {
  if (!nome) return "—";
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

type MenuProps = {
  destinos: OsStatus[];
  aoMover: (para: OsStatus) => void;
  numero: string;
};

/** Alternativa acessível ao arrastar: menu "Mover para…". */
export function MenuMover({ destinos, aoMover, numero }: MenuProps) {
  if (destinos.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={`Mover OS ${numero} para…`}
        >
          <ArrowRightLeft aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mover para…</DropdownMenuLabel>
        {destinos.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => aoMover(s)}>
            {STATUS_OS[s].rotulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Props = {
  slug: string;
  cartao: CartaoOs;
  hoje: string;
  destinos: OsStatus[];
  aoMover: (para: OsStatus) => void;
  /** Mostra o selo de status (lista/celular). */
  mostrarStatus?: boolean;
  className?: string;
};

export function ConteudoCartao({ slug, cartao: c, hoje, destinos, aoMover, mostrarStatus, className }: Props) {
  const atrasada = estaAtrasada(c, hoje);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/${slug}/os/${c.id}`}
          className="inline-flex min-h-8 items-center font-mono text-xs text-texto-secundario hover:text-primaria hover:underline"
        >
          OS {c.numero}
        </Link>
        <span className="flex items-center gap-1.5">
          {c.ehGarantia && (
            <span className="rounded-md bg-perigo-suave px-2 py-0.5 text-xs font-semibold text-perigo">
              Garantia
            </span>
          )}
          {mostrarStatus ? (
            <StatusBadge status={c.status} />
          ) : c.clienteTipo === "lojista" ? (
            <span className="rounded-md bg-info-suave px-2 py-0.5 text-xs font-semibold text-info">
              Lojista
            </span>
          ) : (
            <span className="rounded-md bg-sucesso-suave px-2 py-0.5 text-xs font-semibold text-sucesso">
              Cliente final
            </span>
          )}
        </span>
      </div>
      <div className="text-[15px] leading-snug font-semibold text-texto">{c.clienteNome}</div>
      <div className="text-[13px] leading-snug text-texto-secundario">{c.motor}</div>
      {c.placa && (
        <div className="text-xs text-texto-secundario">
          Carro do cliente: <span className="font-mono text-texto">{formatarPlaca(c.placa)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-borda pt-2">
        <span
          title={c.tecnicoNome ?? "Sem técnico"}
          className="inline-flex size-7 items-center justify-center rounded-full bg-fundo text-[11px] font-semibold text-neutro"
        >
          {iniciais(c.tecnicoNome)}
        </span>
        <span className={cn("text-xs", atrasada ? "font-semibold text-perigo" : "text-texto-secundario")}>
          {rotuloPrazo(c, hoje)}
        </span>
        <MenuMover destinos={destinos} aoMover={aoMover} numero={c.numero} />
      </div>
    </div>
  );
}
