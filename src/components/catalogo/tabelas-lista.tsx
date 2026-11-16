"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListChecks, Pencil, Plus, Power, Tags, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/sonner";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import type { TabelaPrecoLista } from "@/lib/catalogo/tipos";
import { alternarAtivoTabelaPreco } from "@/app/(app)/[empresa]/catalogo/actions";
import { TabelaDialog } from "./tabela-dialog";

const ROTULO_PADRAO = { lojista: "Padrão dos lojistas", final: "Padrão dos clientes finais" } as const;

function textoClientes(t: TabelaPrecoLista): string {
  const total = t.clientes_explicitos + t.clientes_por_padrao;
  if (total === 0) return "Nenhum cliente";
  const base = `${total} ${total === 1 ? "cliente" : "clientes"}`;
  return t.clientes_por_padrao > 0 && t.clientes_explicitos > 0
    ? `${base} (${t.clientes_por_padrao} pelo padrão)`
    : t.clientes_por_padrao > 0
      ? `${base} pelo padrão`
      : base;
}

export function TabelasLista({ tabelas }: { tabelas: TabelaPrecoLista[] }) {
  const { empresa } = useEmpresa();
  const { pode } = usePermissao();
  const podeEditar = pode("catalogo.editar");
  const router = useRouter();
  const [editando, setEditando] = React.useState<TabelaPrecoLista | "nova" | null>(null);
  const [, startTransition] = React.useTransition();
  const base = `/${empresa.slug}/catalogo/tabelas`;

  function alternarAtivo(t: TabelaPrecoLista) {
    startTransition(async () => {
      const r = await alternarAtivoTabelaPreco(empresa.slug, { id: t.id, ativo: !t.ativo });
      if (r.ok) toast.success(t.ativo ? "Tabela inativada" : "Tabela reativada");
      else toast.error(r.erro);
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-texto-secundario">
          Cada cliente usa a tabela escolhida no cadastro ou a padrão do seu tipo.
        </p>
        {podeEditar && (
          <Button onClick={() => setEditando("nova")}>
            <Plus aria-hidden /> Nova tabela
          </Button>
        )}
      </div>

      {tabelas.length === 0 ? (
        <EmptyState
          icone={<Tags aria-hidden />}
          titulo="Nenhuma tabela de preço"
          descricao="Crie tabelas (ex.: Lojista, Cliente final) com desconto padrão e preços específicos por item."
          acoes={
            podeEditar && (
              <Button onClick={() => setEditando("nova")}>
                <Plus aria-hidden /> Nova tabela
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {tabelas.map((t) => (
            <li key={t.id}>
              <Card className={t.ativo ? undefined : "opacity-70"}>
                <CardContent className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">{t.nome}</h2>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {t.padrao_para && <Badge variant="primaria">{ROTULO_PADRAO[t.padrao_para]}</Badge>}
                        {!t.ativo && <Badge variant="contorno">Inativa</Badge>}
                      </div>
                    </div>
                    <p className="shrink-0 text-right">
                      <span className="text-2xl font-bold tabular-nums">
                        {t.desconto_padrao_pct.toLocaleString("pt-BR")}%
                      </span>
                      <span className="block text-xs text-texto-secundario">de desconto</span>
                    </p>
                  </div>
                  <dl className="grid gap-1 text-[15px] text-texto-secundario">
                    <div className="flex items-center gap-2">
                      <Users className="size-4" aria-hidden />
                      <dt className="sr-only">Clientes</dt>
                      <dd>{textoClientes(t)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <ListChecks className="size-4" aria-hidden />
                      <dt className="sr-only">Preços específicos</dt>
                      <dd>
                        {t.itens_especificos === 0
                          ? "Só o desconto padrão"
                          : `${t.itens_especificos} ${t.itens_especificos === 1 ? "preço específico" : "preços específicos"}`}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary">
                      <Link href={`${base}/${t.id}`}>{podeEditar ? "Editar preços" : "Ver preços"}</Link>
                    </Button>
                    {podeEditar && (
                      <>
                        <Button variant="ghost" onClick={() => setEditando(t)}>
                          <Pencil aria-hidden /> Dados
                        </Button>
                        <Button variant="ghost" onClick={() => alternarAtivo(t)}>
                          <Power aria-hidden /> {t.ativo ? "Inativar" : "Reativar"}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {podeEditar && editando && (
        <TabelaDialog
          key={editando === "nova" ? "nova" : editando.id}
          tabela={editando === "nova" ? null : editando}
          onFechar={() => setEditando(null)}
          aoSalvar={(id) => {
            if (editando === "nova") router.push(`${base}/${id}`);
          }}
        />
      )}
    </>
  );
}
