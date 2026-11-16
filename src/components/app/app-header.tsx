"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import { BuscaGlobal } from "./busca-global";
import { MenuUsuario } from "./menu-usuario";

/** Topo preto com faixa vermelha: logo, busca global, Nova OS e usuário. */
export function AppHeader() {
  const { empresa } = useEmpresa();
  const { pode } = usePermissao();
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-primaria bg-preto text-white">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-4 lg:gap-4 lg:px-6">
        <Link
          href={`/${empresa.slug}/inicio`}
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-white"
          aria-label={`${empresa.nome_fantasia} — início`}
        >
          <Image
            src="/brand/wl-marca.png"
            alt=""
            width={600}
            height={221}
            priority
            className="h-9 w-auto rounded-md sm:h-10"
          />
          <span className="hidden max-w-48 truncate text-lg font-bold xl:inline">{empresa.nome_fantasia}</span>
        </Link>

        <BuscaGlobal className="lg:max-w-xl" />

        {pode("os.abrir") && (
          <Button asChild className="hidden md:inline-flex">
            <Link href={`/${empresa.slug}/os/nova`}>
              <Plus strokeWidth={2.5} aria-hidden />
              Nova OS
            </Link>
          </Button>
        )}

        <MenuUsuario className="shrink-0" />
      </div>
    </header>
  );
}
