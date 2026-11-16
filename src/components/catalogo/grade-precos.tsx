"use client";

import * as React from "react";
import { Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { FormErro } from "@/components/ui/form";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import { chaveItem, descontoEfetivoPct, precoEfetivo } from "@/lib/catalogo/calculos";
import type { LinhaPrecoTabela } from "@/lib/catalogo/tipos";
import { formatarMoeda } from "@/lib/format";
import { salvarPrecosTabela } from "@/app/(app)/[empresa]/catalogo/actions";
import { normalizar } from "./barra-filtro";
import { CampoMoeda } from "./campo-moeda";
import { TabelaDialog, type TabelaEditavel } from "./tabela-dialog";

type Props = {
  tabela: TabelaEditavel & { ativo: boolean };
  linhas: LinhaPrecoTabela[];
};

/**
 * Grade editável: preço base ao lado, preço próprio da tabela (vazio = usa o
 * desconto padrão) e preço efetivo calculado na hora.
 */
export function GradePrecos({ tabela, linhas }: Props) {
  const { empresa } = useEmpresa();
  const { pode } = usePermissao();
  const podeEditar = pode("catalogo.editar");
  const [aba, setAba] = React.useState<"servico" | "peca">("servico");
  const [busca, setBusca] = React.useState("");
  const [editandoDados, setEditandoDados] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();

  const inicial = React.useMemo(() => {
    const m = new Map<string, number | null>();
    for (const l of linhas) m.set(chaveItem(l.tipo, l.id), l.preco_especifico);
    return m;
  }, [linhas]);
  const [valores, setValores] = React.useState<Map<string, number | null>>(inicial);

  // Quando o servidor devolve dados novos (após salvar), recomeça da base nova.
  React.useEffect(() => setValores(inicial), [inicial]);

  const alteradas = linhas.filter(
    (l) => (valores.get(chaveItem(l.tipo, l.id)) ?? null) !== (inicial.get(chaveItem(l.tipo, l.id)) ?? null),
  );

  const visiveis = React.useMemo(() => {
    const termo = normalizar(busca.trim());
    return linhas.filter(
      (l) =>
        l.tipo === aba &&
        (termo === "" || normalizar(`${l.descricao} ${l.codigo ?? ""} ${l.grupo ?? ""}`).includes(termo)),
    );
  }, [linhas, aba, busca]);

  const qtdServicos = linhas.filter((l) => l.tipo === "servico").length;
  const qtdPecas = linhas.length - qtdServicos;

  function salvar() {
    startTransition(async () => {
      setErro(null);
      const r = await salvarPrecosTabela(empresa.slug, tabela.id, {
        itens: alteradas.map((l) => ({
          tipo: l.tipo,
          id: l.id,
          preco: valores.get(chaveItem(l.tipo, l.id)) ?? null,
        })),
      });
      if (r.ok) toast.success("Preços da tabela salvos");
      else setErro(r.erro);
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-texto-secundario">
          Desconto padrão de <strong className="text-texto">{tabela.desconto_padrao_pct.toLocaleString("pt-BR")}%</strong>{" "}
          sobre o preço base. Preencha &ldquo;Preço da tabela&rdquo; só nos itens com preço próprio.
        </p>
        {podeEditar && (
          <Button variant="secondary" onClick={() => setEditandoDados(true)}>
            <Pencil aria-hidden /> Dados da tabela
          </Button>
        )}
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as "servico" | "peca")}>
        <TabsList>
          <TabsTrigger value="servico">Serviços ({qtdServicos})</TabsTrigger>
          <TabsTrigger value="peca">Peças ({qtdPecas})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative my-4">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-texto-secundario"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Buscar item da tabela"
          placeholder="Buscar item"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {visiveis.length === 0 ? (
        <EmptyState
          titulo={linhas.some((l) => l.tipo === aba) ? "Nada encontrado" : "Nada cadastrado"}
          descricao={
            linhas.some((l) => l.tipo === aba)
              ? "Ajuste a busca."
              : `Cadastre ${aba === "servico" ? "serviços" : "peças"} no catálogo para definir preços aqui.`
          }
        />
      ) : (
        <Card className="gap-0 py-0">
          <div
            className="hidden border-b border-borda px-4 py-2 text-xs font-semibold tracking-wide text-texto-secundario uppercase md:grid md:grid-cols-[minmax(0,1fr)_7rem_11rem_8rem] md:gap-4"
            aria-hidden
          >
            <span>Item</span>
            <span className="text-right">Preço base</span>
            <span className="text-right">Preço da tabela</span>
            <span className="text-right">Efetivo</span>
          </div>
          <ul className="divide-y divide-borda">
            {visiveis.map((l) => {
              const chave = chaveItem(l.tipo, l.id);
              const especifico = valores.get(chave) ?? null;
              const efetivo = precoEfetivo({
                precoBase: l.preco_base,
                descontoPct: tabela.desconto_padrao_pct,
                precoEspecifico: especifico,
              });
              const diff = descontoEfetivoPct(l.preco_base, efetivo);
              const mudou = (inicial.get(chave) ?? null) !== especifico;
              return (
                <li
                  key={chave}
                  className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_7rem_11rem_8rem] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{l.descricao}</p>
                    <p className="text-sm text-texto-secundario">
                      {[l.codigo, l.grupo].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <p className="flex justify-between text-[15px] tabular-nums md:block md:text-right">
                    <span className="text-sm text-texto-secundario md:hidden">Base</span>
                    {formatarMoeda(l.preco_base)}
                  </p>
                  <div>
                    <CampoMoeda
                      aria-label={`Preço da tabela para ${l.descricao}`}
                      valor={especifico}
                      placeholder="usa desconto"
                      disabled={!podeEditar}
                      onValorChange={(v) =>
                        setValores((atual) => new Map(atual).set(chave, v))
                      }
                      className={mudou ? "border-primaria" : undefined}
                    />
                  </div>
                  <p className="flex justify-between text-right tabular-nums md:block">
                    <span className="text-sm text-texto-secundario md:hidden">Efetivo</span>
                    <span>
                      <strong>{formatarMoeda(efetivo)}</strong>
                      {diff !== 0 && (
                        <span className="block text-xs text-texto-secundario">
                          {diff > 0 ? `−${diff.toLocaleString("pt-BR")}%` : `+${Math.abs(diff).toLocaleString("pt-BR")}%`}
                        </span>
                      )}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {podeEditar && alteradas.length > 0 && (
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-10 mt-4 grid gap-2 rounded-xl border border-borda-forte bg-superficie p-3 shadow-lg md:bottom-4">
          <FormErro mensagem={erro} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] font-medium">
              {alteradas.length} {alteradas.length === 1 ? "alteração" : "alterações"} não salvas
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setValores(inicial)} disabled={pendente}>
                Descartar
              </Button>
              <Button onClick={salvar} disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar preços"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editandoDados && (
        <TabelaDialog tabela={tabela} onFechar={() => setEditandoDados(false)} />
      )}
    </>
  );
}
