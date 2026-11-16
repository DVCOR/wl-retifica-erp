"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, Plus, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import type { KitLista } from "@/lib/catalogo/tipos";
import { formatarMoeda } from "@/lib/format";
import { alternarAtivoKit } from "@/app/(app)/[empresa]/catalogo/actions";
import { BarraFiltro, normalizar } from "./barra-filtro";

const SEM_TABELA = "base";

type KitsListaProps = {
  kits: KitLista[];
  tabelas: { id: string; nome: string }[];
  /** Tabela usada na estimativa (null = preço base). */
  tabelaId: string | null;
};

export function KitsLista({ kits, tabelas, tabelaId }: KitsListaProps) {
  const { empresa } = useEmpresa();
  const { pode, vePrecos } = usePermissao();
  const podeEditar = pode("catalogo.editar");
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = React.useState("");
  const [inativos, setInativos] = React.useState(false);
  const [, startTransition] = React.useTransition();
  const base = `/${empresa.slug}/catalogo/kits`;

  const filtrados = React.useMemo(() => {
    const termo = normalizar(busca.trim());
    return kits.filter(
      (k) =>
        (inativos || k.ativo) &&
        (termo === "" || normalizar(`${k.nome} ${k.descricao ?? ""}`).includes(termo)),
    );
  }, [kits, busca, inativos]);

  function alternarAtivo(k: KitLista) {
    startTransition(async () => {
      const r = await alternarAtivoKit(empresa.slug, { id: k.id, ativo: !k.ativo });
      if (r.ok) toast.success(k.ativo ? "Kit inativado" : "Kit reativado");
      else toast.error(r.erro);
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        {vePrecos && tabelas.length > 0 ? (
          <div className="grid w-full gap-1.5 sm:w-72">
            <Label htmlFor="tabela-estimativa">Total estimado pela tabela</Label>
            <Select
              value={tabelaId ?? SEM_TABELA}
              onValueChange={(v) =>
                router.replace(v === SEM_TABELA ? pathname : `${pathname}?tabela=${v}`)
              }
            >
              <SelectTrigger id="tabela-estimativa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_TABELA}>Preço base (sem tabela)</SelectItem>
                {tabelas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-[15px] text-texto-secundario">
            Pacotes de serviços e peças para orçar de uma vez.
          </p>
        )}
        {podeEditar && (
          <Button asChild>
            <Link href={`${base}/novo`}>
              <Plus aria-hidden /> Novo kit
            </Link>
          </Button>
        )}
      </div>

      {kits.length === 0 ? (
        <EmptyState
          icone={<Boxes aria-hidden />}
          titulo="Nenhum kit cadastrado"
          descricao="Monte kits como “Retífica completa de cabeçote 8v” para lançar vários itens no orçamento com um toque."
          acoes={
            podeEditar && (
              <Button asChild>
                <Link href={`${base}/novo`}>
                  <Plus aria-hidden /> Novo kit
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <BarraFiltro
            busca={busca}
            onBuscaChange={setBusca}
            rotulo="Buscar kit"
            placeholder="Buscar kit"
            mostrarInativos={inativos}
            onMostrarInativosChange={setInativos}
          />
          {filtrados.length === 0 ? (
            <EmptyState
              titulo="Nada encontrado"
              descricao="Ajuste a busca ou mostre os inativos."
            />
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {filtrados.map((k) => (
                <li key={k.id}>
                  <Card className={k.ativo ? undefined : "opacity-70"}>
                    <CardContent className="grid gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold">
                            {k.nome}
                            {!k.ativo && (
                              <Badge variant="contorno" className="ml-2 align-middle">
                                Inativo
                              </Badge>
                            )}
                          </h2>
                          {k.descricao && (
                            <p className="text-[15px] text-texto-secundario">{k.descricao}</p>
                          )}
                        </div>
                        {k.total !== null && (
                          <p className="shrink-0 text-right">
                            <span className="text-xl font-bold tabular-nums">
                              {formatarMoeda(k.total)}
                            </span>
                            <span className="block text-xs text-texto-secundario">estimado</span>
                          </p>
                        )}
                      </div>
                      <p className="text-[15px] text-texto-secundario">
                        {k.itens.length === 0
                          ? "Sem itens"
                          : k.itens
                              .slice(0, 3)
                              .map((i) => `${i.quantidade.toLocaleString("pt-BR")}× ${i.descricao}`)
                              .join(" · ") +
                            (k.itens.length > 3 ? ` · +${k.itens.length - 3}` : "")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="secondary">
                          <Link href={`${base}/${k.id}${tabelaId ? `?tabela=${tabelaId}` : ""}`}>
                            {podeEditar ? "Editar kit" : "Ver itens"}
                          </Link>
                        </Button>
                        {podeEditar && (
                          <Button variant="ghost" onClick={() => alternarAtivo(k)}>
                            <Power aria-hidden /> {k.ativo ? "Inativar" : "Reativar"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
