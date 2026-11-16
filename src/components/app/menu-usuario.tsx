"use client";

import Link from "next/link";
import { Building2, ChevronDown, LogOut } from "lucide-react";
import { AvatarIniciais } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmpresa } from "@/lib/auth/empresa-context";
import { ROTULO_PAPEL } from "@/lib/auth/permissoes";
import { sair } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

/** Usuário + papel; troca de empresa e sair. */
export function MenuUsuario({ className }: { className?: string }) {
  const { membro, empresa, empresas, usuario } = useEmpresa();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-lg px-1.5 text-left text-white hover:bg-preto-2 focus-visible:outline-white",
          className,
        )}
        aria-label={`Conta de ${membro.nome}, ${ROTULO_PAPEL[membro.papel]}`}
      >
        <AvatarIniciais nome={membro.nome} />
        <span className="hidden flex-col leading-tight lg:flex">
          <span className="text-sm font-semibold">{membro.nome}</span>
          <span className="text-xs text-texto-claro">{ROTULO_PAPEL[membro.papel]}</span>
        </span>
        <ChevronDown className="hidden size-4 text-texto-claro lg:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-3 py-2">
          <p className="truncate text-[15px] font-semibold">{membro.nome}</p>
          <p className="truncate text-sm text-texto-secundario">{usuario.email}</p>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {ROTULO_PAPEL[membro.papel]} · {empresa.nome_fantasia}
          </p>
        </div>
        {empresas.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Trocar de empresa</DropdownMenuLabel>
            {empresas.map((e) => (
              <DropdownMenuItem key={e.id} asChild disabled={e.slug === empresa.slug}>
                <Link href={`/${e.slug}/inicio`}>
                  <Building2 aria-hidden />
                  <span className="flex-1 truncate">{e.nome_fantasia}</span>
                  <span className="text-xs text-texto-secundario">{ROTULO_PAPEL[e.papel]}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <form action={sair}>
          <DropdownMenuItem variant="destructive" asChild>
            <button type="submit" className="w-full">
              <LogOut aria-hidden />
              Sair
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
