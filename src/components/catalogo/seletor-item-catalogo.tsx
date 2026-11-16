"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Boxes, Loader2, Package, Search, Wrench } from "lucide-react";
import { usePermissao } from "@/lib/auth/empresa-context";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { buscarItensCatalogo, type ItemCatalogo } from "@/lib/catalogo/busca";
import { ROTULO_UNIDADE_CURTO, type UnidadeServico } from "@/lib/catalogo/calculos";
import { formatarMoeda } from "@/lib/format";
import { cn } from "@/lib/utils";

export type { ItemCatalogo } from "@/lib/catalogo/busca";

export type SeletorItemCatalogoProps = {
  empresaId: string;
  /** Tabela de preço do cliente; sem ela o preço sugerido é o preço base. */
  tabelaPrecoId?: string | null;
  /** Chamado ao escolher: tipo, id, descrição, unidade e preço sugerido. */
  onSelecionar: (item: ItemCatalogo) => void;
  /** Restringe os tipos buscados (padrão: serviços, peças e kits). */
  tipos?: readonly ItemCatalogo["tipo"][];
  placeholder?: string;
  /** Nome acessível do campo (padrão: "Buscar no catálogo"). */
  rotulo?: string;
  disabled?: boolean;
  className?: string;
};

const ICONE = { servico: Wrench, peca: Package, kit: Boxes } as const;
const TITULO_GRUPO = { servico: "Serviços", peca: "Peças", kit: "Kits" } as const;

function rotuloUnidade(item: ItemCatalogo): string | null {
  if (item.tipo === "kit") return null;
  if (item.tipo === "servico")
    return ROTULO_UNIDADE_CURTO[item.unidade as UnidadeServico] ?? item.unidade;
  return item.unidade;
}

/**
 * Combobox único para buscar serviços, peças e kits do catálogo.
 * Teclado: digitar filtra, setas navegam, Enter escolhe, Esc fecha.
 * O preço sugerido respeita a tabela de preço e some para quem não vê preços.
 */
export function SeletorItemCatalogo({
  empresaId,
  tabelaPrecoId,
  onSelecionar,
  tipos,
  placeholder = "Buscar serviço, peça ou kit",
  rotulo = "Buscar no catálogo",
  disabled,
  className,
}: SeletorItemCatalogoProps) {
  const { vePrecos } = usePermissao();
  const idLista = React.useId();
  const raiz = React.useRef<HTMLDivElement>(null);
  const [termo, setTermo] = React.useState("");
  const [aberto, setAberto] = React.useState(false);
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState(false);
  const [itens, setItens] = React.useState<ItemCatalogo[]>([]);
  const sequencia = React.useRef(0);
  const tiposChave = (tipos ?? []).join(",");

  // Busca com debounce; descarta respostas atrasadas.
  React.useEffect(() => {
    if (!aberto) return;
    const minha = ++sequencia.current;
    const t = setTimeout(async () => {
      setCarregando(true);
      setErro(false);
      try {
        const r = await buscarItensCatalogo(criarClienteNavegador(), {
          empresaId,
          termo,
          vePrecos,
          tabelaPrecoId,
          tipos: tiposChave ? (tiposChave.split(",") as ItemCatalogo["tipo"][]) : undefined,
        });
        if (minha === sequencia.current) setItens(r);
      } catch {
        if (minha === sequencia.current) setErro(true);
      } finally {
        if (minha === sequencia.current) setCarregando(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [termo, aberto, empresaId, vePrecos, tabelaPrecoId, tiposChave]);

  function escolher(item: ItemCatalogo) {
    onSelecionar(item);
    setTermo("");
    setAberto(false);
  }

  const grupos = (["servico", "peca", "kit"] as const)
    .map((tipo) => ({ tipo, itens: itens.filter((i) => i.tipo === tipo) }))
    .filter((g) => g.itens.length > 0);

  return (
    <div
      ref={raiz}
      className={cn("relative", className)}
      onBlur={(e) => {
        if (!raiz.current?.contains(e.relatedTarget as Node | null)) setAberto(false);
      }}
    >
      <CommandPrimitive
        shouldFilter={false}
        loop
        label={rotulo}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAberto(false);
        }}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-texto-secundario"
            aria-hidden
          />
          <CommandPrimitive.Input
            value={termo}
            onValueChange={(v) => {
              setTermo(v);
              setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={rotulo}
            aria-controls={idLista}
            aria-expanded={aberto}
            autoComplete="off"
            className="flex h-11 w-full min-w-0 rounded-lg border border-input bg-superficie pr-10 pl-10 text-[15px] text-texto placeholder:text-texto-secundario/70 focus-visible:border-primaria focus-visible:outline-2 focus-visible:outline-primaria/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {carregando && (
            <Loader2
              className="absolute top-1/2 right-3 size-[18px] -translate-y-1/2 animate-spin text-texto-secundario"
              aria-hidden
            />
          )}
        </div>

        {aberto && (
          <CommandPrimitive.List
            id={idLista}
            className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-borda bg-superficie p-1.5 shadow-lg"
          >
            {erro ? (
              <p role="alert" className="px-3 py-6 text-center text-[15px] text-perigo">
                Não foi possível buscar agora. Tente de novo.
              </p>
            ) : carregando && itens.length === 0 ? (
              <p className="px-3 py-6 text-center text-[15px] text-texto-secundario">Buscando…</p>
            ) : grupos.length === 0 ? (
              <CommandPrimitive.Empty className="px-3 py-6 text-center text-[15px] text-texto-secundario">
                Nenhum item encontrado
              </CommandPrimitive.Empty>
            ) : (
              grupos.map((g) => (
                <CommandPrimitive.Group
                  key={g.tipo}
                  heading={TITULO_GRUPO[g.tipo]}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-texto-secundario [&_[cmdk-group-heading]]:uppercase"
                >
                  {g.itens.map((item) => {
                    const Icone = ICONE[item.tipo];
                    const unidade = rotuloUnidade(item);
                    return (
                      <CommandPrimitive.Item
                        key={`${item.tipo}:${item.id}`}
                        value={`${item.tipo}:${item.id}`}
                        onSelect={() => escolher(item)}
                        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-[15px] outline-none select-none data-[selected=true]:bg-fundo"
                      >
                        <Icone className="size-[18px] shrink-0 text-texto-secundario" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.descricao}</span>
                          <span className="block truncate text-sm text-texto-secundario">
                            {[item.codigo, item.detalhe].filter(Boolean).join(" · ") || " "}
                          </span>
                        </span>
                        {item.precoSugerido !== null && (
                          <span className="shrink-0 text-right font-semibold tabular-nums">
                            {formatarMoeda(item.precoSugerido)}
                            {unidade && unidade !== "un" && (
                              <span className="block text-xs font-normal text-texto-secundario">
                                por {unidade}
                              </span>
                            )}
                          </span>
                        )}
                      </CommandPrimitive.Item>
                    );
                  })}
                </CommandPrimitive.Group>
              ))
            )}
          </CommandPrimitive.List>
        )}
      </CommandPrimitive>
    </div>
  );
}
