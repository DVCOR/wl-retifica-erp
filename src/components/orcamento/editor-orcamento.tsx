"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Send, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CampoMoeda } from "@/components/catalogo/campo-moeda";
import { SeletorItemCatalogo, type ItemCatalogo } from "@/components/catalogo/seletor-item-catalogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresa } from "@/lib/auth/empresa-context";
import { formatarMoeda } from "@/lib/format";
import { avaliarDesconto, calcularTotais, totalItem } from "@/lib/orcamento/calculos";
import { cn } from "@/lib/utils";
import {
  adicionarItemAction,
  adicionarKitAction,
  aprovarDescontoAction,
  atualizarItemAction,
  atualizarOrcamentoAction,
  enviarOrcamentoAction,
  removerItemAction,
} from "@/app/(app)/[empresa]/os/[id]/orcamento/actions";

export type ItemEditor = {
  id: string;
  tipo: "servico" | "peca";
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  sugerido_por: string | null;
};

export type OrcamentoEditor = {
  id: string;
  versao: number;
  desconto: number;
  validade: string | null;
  observacoes: string | null;
  descontoAprovado: boolean;
};

type Props = {
  slug: string;
  osId: string;
  orcamento: OrcamentoEditor;
  itens: ItemEditor[];
  tabelaPrecoId: string | null;
};

/** Editor do rascunho: itens, desconto, validade, observações e totais ao vivo. */
export function EditorOrcamento({ slug, osId, orcamento, itens: itensServidor, tabelaPrecoId }: Props) {
  const { empresa, membro } = useEmpresa();
  const [itens, setItens] = React.useState<ItemEditor[]>(itensServidor);
  const [desconto, setDesconto] = React.useState<number | null>(orcamento.desconto);
  const [validade, setValidade] = React.useState(orcamento.validade ?? "");
  const [observacoes, setObservacoes] = React.useState(orcamento.observacoes ?? "");
  const [pendente, executar] = React.useTransition();

  // Reconcilia com o servidor quando itens entram/saem (mantém edições locais).
  const chaveServidor = itensServidor.map((i) => i.id).join(",");
  const [chaveVista, setChaveVista] = React.useState(chaveServidor);
  if (chaveVista !== chaveServidor) {
    setChaveVista(chaveServidor);
    setItens((atual) => itensServidor.map((s) => atual.find((a) => a.id === s.id) ?? s));
  }

  const totais = calcularTotais(
    itens.map((i) => ({
      quantidade: i.quantidade,
      precoUnitario: i.preco_unitario,
      desconto: i.desconto,
    })),
    desconto ?? 0,
  );
  const avaliacao = avaliarDesconto({
    totais,
    limitePct: membro.limite_desconto_pct,
    papel: membro.papel,
    aprovadoPeloDono: orcamento.descontoAprovado,
  });
  const ehDono = membro.papel === "dono";

  function resultado(r: { ok: boolean; erro?: string }) {
    if (!r.ok) toast.error(r.erro ?? "Não foi possível salvar.");
    return r.ok;
  }

  function adicionar(item: ItemCatalogo) {
    executar(async () => {
      if (item.tipo === "kit") {
        const r = await adicionarKitAction(slug, osId, { orcamento_id: orcamento.id, kit_id: item.id });
        if (resultado(r) && r.ok) toast.success(`Kit inserido (${r.dados.itens} itens).`);
        return;
      }
      resultado(
        await adicionarItemAction(slug, osId, {
          orcamento_id: orcamento.id,
          tipo: item.tipo,
          item_id: item.id,
          descricao: item.descricao,
        }),
      );
    });
  }

  function alterarItem(id: string, patch: Partial<ItemEditor>) {
    setItens((lista) => lista.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function salvarItem(id: string) {
    const i = itens.find((x) => x.id === id);
    if (!i) return;
    executar(async () => {
      resultado(
        await atualizarItemAction(slug, osId, id, {
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto: Math.min(i.desconto, Math.round(i.quantidade * i.preco_unitario * 100) / 100),
        }),
      );
    });
  }

  function salvarOrcamento(patch: { desconto?: number; validade?: string; observacoes?: string }) {
    executar(async () => {
      resultado(await atualizarOrcamentoAction(slug, osId, orcamento.id, patch));
    });
  }

  function enviar() {
    executar(async () => {
      const r = await enviarOrcamentoAction(slug, osId, orcamento.id);
      if (resultado(r)) toast.success("Orçamento enviado. Compartilhe o link com o cliente.");
    });
  }

  function aprovarDesconto() {
    executar(async () => {
      if (resultado(await aprovarDescontoAction(slug, osId, orcamento.id)))
        toast.success("Desconto aprovado pelo dono.");
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2" aria-label="Adicionar itens">
        <Label htmlFor="busca-item-orcamento">Adicionar serviço, peça ou kit</Label>
        <SeletorItemCatalogo
          empresaId={empresa.id}
          tabelaPrecoId={tabelaPrecoId}
          onSelecionar={adicionar}
          disabled={pendente}
          rotulo="Adicionar item ao orçamento"
        />
      </section>

      <section aria-label="Itens do orçamento" className="space-y-3">
        {itens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borda-forte bg-superficie px-4 py-8 text-center text-[15px] text-texto-secundario">
            Nenhum item ainda. Busque um serviço, uma peça ou insira um kit acima; o preço vem da
            tabela do cliente e a quantidade, do motor.
          </p>
        ) : (
          itens.map((i) => (
            <div
              key={i.id}
              className={cn(
                "rounded-xl border bg-superficie p-3 md:p-4",
                i.sugerido_por ? "border-alerta border-l-4 bg-alerta-suave/40" : "border-borda",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-texto">{i.descricao}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="neutro">{i.tipo === "servico" ? "Serviço" : "Peça"}</Badge>
                    {i.sugerido_por && (
                      <Badge variant="alerta">
                        <UserRound aria-hidden /> Sugerido pelo técnico: revise
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${i.descricao}`}
                  disabled={pendente}
                  onClick={() =>
                    executar(async () => {
                      resultado(await removerItemAction(slug, osId, i.id));
                    })
                  }
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-[110px_1fr_1fr_130px]">
                <div className="space-y-1">
                  <Label htmlFor={`qtd-${i.id}`}>Quantidade</Label>
                  <Input
                    id={`qtd-${i.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    step="any"
                    value={i.quantidade}
                    onChange={(e) => alterarItem(i.id, { quantidade: Math.max(Number(e.target.value), 0) })}
                    onBlur={() => i.quantidade > 0 && salvarItem(i.id)}
                    className="text-right tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`preco-${i.id}`}>Preço unitário</Label>
                  <CampoMoeda
                    id={`preco-${i.id}`}
                    valor={i.preco_unitario}
                    onValorChange={(v) => alterarItem(i.id, { preco_unitario: v ?? 0 })}
                    onBlur={() => salvarItem(i.id)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`desc-${i.id}`}>Desconto (R$)</Label>
                  <CampoMoeda
                    id={`desc-${i.id}`}
                    valor={i.desconto}
                    onValorChange={(v) => alterarItem(i.id, { desconto: v ?? 0 })}
                    onBlur={() => salvarItem(i.id)}
                  />
                </div>
                <div className="col-span-2 space-y-1 md:col-span-1">
                  <span className="text-sm font-medium text-texto">Total</span>
                  <p className="flex h-11 items-center justify-end text-[17px] font-bold tabular-nums">
                    {formatarMoeda(
                      totalItem({
                        quantidade: i.quantidade,
                        precoUnitario: i.preco_unitario,
                        desconto: i.desconto,
                      }),
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Condições">
        <div className="space-y-4 rounded-xl border border-borda bg-superficie p-4">
          <div className="space-y-1">
            <Label htmlFor="desconto-total">Desconto no total (R$)</Label>
            <CampoMoeda
              id="desconto-total"
              valor={desconto}
              onValorChange={setDesconto}
              onBlur={() => salvarOrcamento({ desconto: desconto ?? 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="validade">Válido até</Label>
            <Input
              id="validade"
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              onBlur={() => validade && salvarOrcamento({ validade })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="obs-orcamento">Observações para o cliente</Label>
            <Textarea
              id="obs-orcamento"
              rows={3}
              value={observacoes}
              maxLength={2000}
              placeholder="Ex.: prazo de entrega, condições de pagamento"
              onChange={(e) => setObservacoes(e.target.value)}
              onBlur={() => salvarOrcamento({ observacoes })}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-borda bg-superficie p-4" aria-live="polite">
          <Linha rotulo="Subtotal dos itens" valor={totais.bruto} />
          {totais.descontoItens > 0 && (
            <Linha rotulo="Descontos nos itens" valor={-totais.descontoItens} />
          )}
          {totais.descontoTotal > 0 && (
            <Linha rotulo="Desconto no total" valor={-totais.descontoTotal} />
          )}
          <div className="flex items-baseline justify-between border-t border-borda pt-3">
            <span className="text-[15px] font-semibold">Total</span>
            <span className="text-2xl font-bold tabular-nums">{formatarMoeda(totais.total)}</span>
          </div>
          {totais.descontoPct > 0 && (
            <p className="text-sm text-texto-secundario">
              Desconto total de {totais.descontoPct.toFixed(2).replace(".", ",")}% (seu limite:{" "}
              {avaliacao.limitePct.toString().replace(".", ",")}%)
            </p>
          )}
        </div>
      </section>

      {avaliacao.excede && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 text-[15px]",
            avaliacao.bloqueado
              ? "border-perigo bg-perigo-suave text-perigo"
              : "border-sucesso bg-sucesso-suave text-sucesso",
          )}
        >
          {avaliacao.bloqueado ? (
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          ) : (
            <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          )}
          <p>
            {avaliacao.bloqueado
              ? avaliacao.mensagem
              : orcamento.descontoAprovado
                ? "Desconto acima do limite aprovado pelo dono."
                : "Desconto acima do limite do balcão: você, como dono, pode enviar."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {ehDono && totais.descontoPct > 0 && !orcamento.descontoAprovado && (
          <Button type="button" variant="secondary" disabled={pendente} onClick={aprovarDesconto}>
            <ShieldCheck aria-hidden /> Aprovar este desconto
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          disabled={pendente || itens.length === 0 || avaliacao.bloqueado}
          onClick={enviar}
        >
          {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Enviar orçamento
        </Button>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between text-[15px]">
      <span className="text-texto-secundario">{rotulo}</span>
      <span className="tabular-nums">{formatarMoeda(valor)}</span>
    </div>
  );
}
