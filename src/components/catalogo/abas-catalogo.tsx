"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import { cn } from "@/lib/utils";

/** Abas do catálogo (sub-rotas); cada página lista a sua logo abaixo do cabeçalho. */
export function AbasCatalogo() {
  const { empresa } = useEmpresa();
  const { vePrecos } = usePermissao();
  const pathname = usePathname();
  const base = `/${empresa.slug}/catalogo`;

  const abas = [
    { href: base, rotulo: "Serviços" },
    { href: `${base}/pecas`, rotulo: "Peças" },
    ...(vePrecos ? [{ href: `${base}/tabelas`, rotulo: "Tabelas de preço" }] : []),
    { href: `${base}/kits`, rotulo: "Kits" },
  ];

  if (!abas.some((a) => a.href === pathname)) return null;

  return (
    <nav aria-label="Seções do catálogo" className="mb-4 border-b border-borda">
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {abas.map((a) => {
          const ativa = a.href === pathname;
          return (
            <li key={a.href} className="shrink-0">
              <Link
                href={a.href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 items-center border-b-2 px-4 text-[15px] font-medium",
                  ativa
                    ? "border-primaria font-semibold text-texto"
                    : "border-transparent text-texto-secundario hover:text-texto",
                )}
              >
                {a.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
