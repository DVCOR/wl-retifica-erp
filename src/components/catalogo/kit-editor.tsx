"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Boxes, Package, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormErro } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import { totalKit } from "@/lib/catalogo/calculos";
import type { ItemKit, KitLista } from "@/lib/catalogo/tipos";
import { formatarMoeda } from "@/lib/format";
import { kitSchema } from "@/lib/validacoes/catalogo";
import { salvarKit } from "@/app/(app)/[empresa]/catalogo/actions";
import { SeletorItemCatalogo, type ItemCatalogo } from "./seletor-item-catalogo";

type KitEditorProps = {
  kit: KitLista | null;
  /** Tabela usada no total estimado (null = preço base). */
  tabelaId: string | null;
  tabelaNome: string | null;
};

type LinhaKit = Omit<ItemKit, "quantidade"> & { quantidade: number | null };

export function KitEditor({ kit, tabelaId, tabelaNome }: KitEditorProps) {
  const { empresa } = useEmpresa();
  const { pode, vePrecos } = usePermissao();
  const somenteLeitura = !pode("catalogo.editar");
  const router = useRouter();
  const [nome, setNome] = React.useState(kit?.nome ?? "");
  const [descricao, setDescricao] = React.useState(kit?.descricao ?? "");
  const [itens, setItens] = React.useState<LinhaKit[]>(kit?.itens ?? []);
  const [erro, setErro] = React.useState<string | null>(null);
  const [campos, setCampos] = React.useState<Record<string, string[] | undefined>>({});
  const [pendente, startTransition] = React.useTransition();

  const total = totalKit(itens.map((i) => ({ quantidade: i.quantidade ?? 0, preco: i.preco })));

  function adicionar(item: ItemCatalogo) {
    if (item.tipo === "kit") return;
    const tipo = item.tipo;
    setItens((atual) => {
      if (atual.some((i) => i.tipo === tipo && i.id === item.id)) {
        return atual.map((i) =>
          i.tipo === tipo && i.id === item.id ? { ...i, quantidade: (i.quantidade ?? 0) + 1 } : i,
        );
      }
      return [
        ...atual,
        {
          tipo,
          id: item.id,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: 1,
          preco: item.precoSugerido,
        },
      ];
    });
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCampos({});
    const entrada = {
      nome,
      descricao,
      itens: itens.map((i) => ({ tipo: i.tipo, id: i.id, quantidade: i.quantidade ?? Number.NaN })),
    };
    const v = kitSchema.safeParse(entrada);
    if (!v.success) {
      const porCampo: Record<string, string[]> = {};
      for (const issue of v.error.issues) {
        const chave = String(issue.path[0] ?? "_");
        (porCampo[chave] ??= []).push(issue.message);
      }
      setCampos(porCampo);
      setErro("Confira os campos destacados.");
      return;
    }
    startTransition(async () => {
      const r = await salvarKit(empresa.slug, kit?.id ?? null, entrada);
      if (r.ok) {
        toast.success(kit ? "Kit atualizado" : "Kit criado");
        router.push(`/${empresa.slug}/catalogo/kits`);
      } else {
        setErro(r.erro);
        if (r.campos) setCampos(r.campos);
      }
    });
  }

  return (
    <form onSubmit={salvar} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]" noValidate>
      <div className="grid content-start gap-5">
        <Card>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="kit-nome">Nome do kit</Label>
              <Input
                id="kit-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                readOnly={somenteLeitura}
                placeholder="Retífica completa de cabeçote 8v"
                aria-invalid={!!campos.nome}
              />
              {campos.nome && (
                <p role="alert" className="text-sm font-medium text-perigo">
                  {campos.nome[0]}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="kit-descricao">Descrição (opcional)</Label>
              <Textarea
                id="kit-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                readOnly={somenteLeitura}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="titulo-itens" className="grid gap-3">
          <h2 id="titulo-itens" className="text-lg font-semibold">
            Itens do kit
          </h2>
          {!somenteLeitura && (
            <SeletorItemCatalogo
              empresaId={empresa.id}
              tabelaPrecoId={tabelaId}
              tipos={["servico", "peca"]}
              rotulo="Adicionar serviço ou peça ao kit"
              placeholder="Buscar serviço ou peça para adicionar"
              onSelecionar={adicionar}
            />
          )}
          {campos.itens && (
            <p role="alert" className="text-sm font-medium text-perigo">
              {campos.itens[0]}
            </p>
          )}
          {itens.length === 0 ? (
            <EmptyState
              icone={<Boxes aria-hidden />}
              titulo="Kit sem itens"
              descricao={
                somenteLeitura
                  ? undefined
                  : "Busque acima os serviços e peças que fazem parte deste kit."
              }
            />
          ) : (
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-borda">
                {itens.map((i, idx) => {
                  const Icone = i.tipo === "servico" ? Wrench : Package;
                  return (
                    <li
                      key={`${i.tipo}:${i.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                    >
                      <Icone className="size-[18px] shrink-0 text-texto-secundario" aria-hidden />
                      <div className="min-w-0 flex-1 basis-44">
                        <p className="font-medium">{i.descricao}</p>
                        {vePrecos && i.preco !== null && (
                          <p className="text-sm text-texto-secundario tabular-nums">
                            {formatarMoeda(i.preco)}
                            {i.unidade !== "un" &&
                              ` por ${i.unidade === "valvula" ? "válvula" : i.unidade}`}
                          </p>
                        )}
                      </div>
                      <Input
                        aria-label={`Quantidade de ${i.descricao}`}
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        step="any"
                        className="w-24 text-right tabular-nums"
                        readOnly={somenteLeitura}
                        value={i.quantidade ?? ""}
                        onChange={(e) =>
                          setItens((atual) =>
                            atual.map((x, n) =>
                              n === idx
                                ? {
                                    ...x,
                                    quantidade:
                                      e.target.value === "" ? null : Number(e.target.value),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      {vePrecos && (
                        <p className="w-28 text-right font-semibold tabular-nums">
                          {i.preco === null ? "—" : formatarMoeda((i.quantidade ?? 0) * i.preco)}
                        </p>
                      )}
                      {!somenteLeitura && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ${i.descricao}`}
                          onClick={() => setItens((atual) => atual.filter((_, n) => n !== idx))}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </section>
      </div>

      <aside className="grid content-start gap-3 lg:sticky lg:top-4">
        {vePrecos && (
          <Card>
            <CardContent className="grid gap-1">
              <p className="text-sm text-texto-secundario">Total estimado</p>
              <p className="text-3xl font-bold tabular-nums">{formatarMoeda(total)}</p>
              <p className="text-sm text-texto-secundario">
                {tabelaNome ? `Tabela ${tabelaNome}` : "Preço base, sem tabela"}. Serviços por
                cilindro ou válvula são multiplicados pelo motor no orçamento.
              </p>
            </CardContent>
          </Card>
        )}
        {!somenteLeitura && (
          <>
            <FormErro mensagem={erro} />
            <Button type="submit" size="lg" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar kit"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/${empresa.slug}/catalogo/kits`)}
            >
              Cancelar
            </Button>
          </>
        )}
      </aside>
    </form>
  );
}
