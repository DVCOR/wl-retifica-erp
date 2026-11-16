"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Cronometro } from "@/components/os/cronometro";
import { UsarRealtime } from "@/components/os/usar-realtime";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { podeMoverOs, type OsStatus } from "@/lib/auth/permissoes";
import type { ApontamentoView, ItemExecucao } from "@/lib/data/os";
import type { MedicaoBancada, OsBancada } from "@/lib/data/bancada";
import { MARCA_CONCLUIDO, somarMs } from "@/lib/os/cronometro";
import { estaAtrasada, rotuloPrazo } from "@/lib/os/quadro";
import { STATUS_OS } from "@/lib/os/status";
import { comprimirImagem } from "@/lib/recebimento/compressao";
import { montarCaminhoAnexo } from "@/lib/recebimento/armazenamento";
import { criarArmazenamentoSupabase } from "@/lib/recebimento/armazenamento-supabase";
import { cn } from "@/lib/utils";
import {
  concluirItemAction,
  iniciarApontamentoAction,
  moverStatusAction,
  pausarApontamentoAction,
  registrarFotoExecucaoAction,
} from "@/app/(app)/[empresa]/os/actions";

type Props = {
  slug: string;
  empresaId: string;
  membroId: string;
  hoje: string;
  minhas: OsBancada[];
  selecionada: OsBancada | null;
  itens: ItemExecucao[];
  apontamentos: ApontamentoView[];
  medicoes: MedicaoBancada[];
};

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });

function textoMedicao(m: MedicaoBancada): string {
  if (m.valor !== null) return `${fmt.format(m.valor)}${m.unidade ? ` ${m.unidade}` : ""}`;
  return m.valor_texto ?? "—";
}

function faixa(m: MedicaoBancada): string | null {
  if (m.maximo !== null && m.minimo !== null) return `${fmt.format(m.minimo)} a ${fmt.format(m.maximo)}`;
  if (m.maximo !== null) return `Máx. ${fmt.format(m.maximo)}`;
  if (m.minimo !== null) return `Mín. ${fmt.format(m.minimo)}`;
  return null;
}

/** Botão de status principal conforme a etapa em que a OS está. */
const PROXIMO: Partial<Record<OsStatus, { para: OsStatus; rotulo: string }>> = {
  recebido: { para: "em_analise", rotulo: "Iniciar análise" },
  aprovado: { para: "em_execucao", rotulo: "Iniciar execução" },
  aguardando_peca: { para: "em_execucao", rotulo: "Peça chegou: retomar" },
};

export function BancadaView({
  slug,
  empresaId,
  membroId,
  hoje,
  minhas,
  selecionada,
  itens,
  apontamentos,
  medicoes,
}: Props) {
  const router = useRouter();
  const [pendente, iniciar] = React.useTransition();
  const [agora] = React.useState(() => Date.now());
  const fotoRef = React.useRef<HTMLInputElement>(null);

  const osId = selecionada?.id ?? "";
  const aberto = apontamentos.find((a) => a.fim === null && a.membro_id === membroId);
  const itemAberto = aberto ? itens.find((i) => i.id === aberto.orcamento_item_id) : null;
  const baseMs = aberto
    ? somarMs(
        apontamentos.filter(
          (a) => a.orcamento_item_id === aberto.orcamento_item_id && a.fim !== null && a.observacao !== MARCA_CONCLUIDO,
        ),
        agora,
      )
    : 0;

  function exec(fn: () => Promise<{ ok: boolean; erro?: string }>, ok?: string) {
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.erro ?? "Não foi possível concluir.");
      else if (ok) toast.success(ok);
      router.refresh();
    });
  }

  function mudarStatus(para: OsStatus, ok: string) {
    exec(() => moverStatusAction(slug, osId, { status: para }), ok);
  }

  function enviarFoto(arquivo: File) {
    iniciar(async () => {
      try {
        const blob = await comprimirImagem(arquivo);
        const caminho = montarCaminhoAnexo(empresaId, osId, {
          prefixo: "execucao",
          id: crypto.randomUUID(),
          extensao: "jpg",
        });
        await criarArmazenamentoSupabase().enviar(caminho, blob, "image/jpeg");
        const r = await registrarFotoExecucaoAction(slug, osId, { caminho });
        if (!r.ok) toast.error(r.erro);
        else toast.success("Foto enviada.");
      } catch (e) {
        toast.error(e instanceof Error ? `Falha no envio: ${e.message}` : "Falha no envio da foto.");
      }
    });
  }

  const status = selecionada?.status;
  const proximo = status ? PROXIMO[status] : undefined;
  const podePronta = status === "em_execucao" && podeMoverOs("tecnico", "em_execucao", "pronto", { atribuidaAoMembro: true });
  const podeAguardar = status === "em_execucao";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <UsarRealtime empresaId={empresaId} />
      <nav aria-label="Minhas OS" className="flex gap-3 overflow-x-auto lg:w-72 lg:shrink-0 lg:flex-col lg:overflow-visible">
        {minhas.map((o) => {
          const atrasada = estaAtrasada({ prazo: o.prazo, status: o.status }, hoje);
          const sel = o.id === selecionada?.id;
          return (
            <Link
              key={o.id}
              href={`/${slug}/bancada?os=${o.id}`}
              aria-current={sel ? "true" : undefined}
              className={cn(
                "flex min-w-60 flex-col gap-1.5 rounded-[14px] border-[3px] bg-superficie p-3.5 lg:min-w-0",
                sel ? "border-primaria" : "border-transparent",
              )}
            >
              <span className="font-mono text-[13px] text-texto-secundario">OS {o.numero}</span>
              <span className="text-lg font-bold">{o.motor}</span>
              <span className={cn("text-sm font-semibold", atrasada ? "text-perigo" : "text-primaria-hover")}>
                {STATUS_OS[o.status].rotulo} · {rotuloPrazo({ prazo: o.prazo, status: o.status }, hoje).toLowerCase()}
              </span>
            </Link>
          );
        })}
        {minhas.length === 0 && (
          <EmptyState
            titulo="Nenhuma OS atribuída"
            descricao="Quando o balcão atribuir uma OS a você, ela aparece aqui."
          />
        )}
      </nav>

      <main className="flex min-w-0 flex-1 flex-col gap-3.5">
        {!selecionada ? null : (
          <>
            <section className="flex flex-wrap items-center gap-4 rounded-[14px] bg-superficie p-5">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-texto-secundario">Serviço em andamento</div>
                <div className="text-[22px] font-bold">
                  {aberto ? (itemAberto?.descricao ?? "Serviço avulso") : "Nenhum serviço em andamento"}
                </div>
              </div>
              <Cronometro
                baseMs={baseMs}
                desde={aberto?.inicio ?? null}
                className="font-mono text-4xl font-bold"
              />
              {aberto ? (
                <Button
                  size="bancada"
                  variant="escuro"
                  className="h-16 rounded-[14px] px-6 text-lg font-bold"
                  disabled={pendente}
                  onClick={() => exec(() => pausarApontamentoAction(slug, osId, aberto.id))}
                >
                  <Pause aria-hidden /> Pausar
                </Button>
              ) : null}
            </section>

            <div className="grid min-h-0 flex-1 gap-3.5 md:grid-cols-2">
              <section className="flex flex-col gap-1 rounded-[14px] bg-superficie p-5">
                <h2 className="text-lg font-bold">Serviços aprovados</h2>
                {itens.length === 0 && (
                  <p className="py-3 text-[15px] text-texto-secundario">
                    Os serviços aparecem aqui depois que o orçamento for aprovado.
                  </p>
                )}
                {itens.map((i) => {
                  const rodando = aberto?.orcamento_item_id === i.id;
                  return (
                    <div key={i.id} className="flex min-h-14 items-center gap-3 border-b border-borda last:border-0">
                      <input
                        id={`item-${i.id}`}
                        type="checkbox"
                        checked={i.concluido}
                        disabled={pendente}
                        onChange={(e) =>
                          exec(() =>
                            concluirItemAction(slug, osId, {
                              orcamento_item_id: i.id,
                              concluido: e.target.checked,
                            }),
                          )
                        }
                        className="size-7 shrink-0 accent-sucesso"
                      />
                      <label
                        htmlFor={`item-${i.id}`}
                        className={cn(
                          "min-w-0 flex-1 py-2 text-base",
                          rodando && "font-semibold",
                          i.concluido && "text-texto-secundario line-through",
                        )}
                      >
                        {i.descricao}
                        {i.quantidade !== 1 && ` (${i.quantidade})`}
                      </label>
                      {!i.concluido && !rodando && status === "em_execucao" && (
                        <Button
                          variant="outline"
                          className="h-12"
                          disabled={pendente}
                          aria-label={`Iniciar ${i.descricao}`}
                          onClick={() =>
                            exec(() => iniciarApontamentoAction(slug, osId, { orcamento_item_id: i.id }))
                          }
                        >
                          <Play aria-hidden /> Iniciar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </section>

              <section className="flex flex-col gap-3 rounded-[14px] bg-superficie p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Medições</h2>
                  <Button asChild variant="outline" className="h-11">
                    <Link href={`/${slug}/os/${osId}/laudo`}>Laudo / + Medição</Link>
                  </Button>
                </div>
                {medicoes.length === 0 && (
                  <p className="text-[15px] text-texto-secundario">Nenhuma medição registrada.</p>
                )}
                {medicoes.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] p-3",
                      m.conforme === false ? "bg-perigo-suave" : "bg-fundo",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">{m.descricao}</div>
                      <div className="text-[13px] text-neutro">{faixa(m) ?? m.componente}</div>
                    </div>
                    <span className="font-mono text-xl font-bold">{textoMedicao(m)}</span>
                    {m.conforme !== null && (
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-[13px] font-bold text-white",
                          m.conforme ? "bg-sucesso" : "bg-perigo",
                        )}
                      >
                        {m.conforme ? "OK" : "Fora"}
                      </span>
                    )}
                  </div>
                ))}
                <p className="text-[13px] text-texto-secundario">
                  Medição fora da faixa sugere um item de orçamento ao balcão.
                </p>
              </section>
            </div>

            <section className="flex flex-wrap gap-3">
              <input
                ref={fotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label="Tirar foto"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) enviarFoto(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                className="h-16 min-w-36 flex-1 border-2 text-[17px]"
                disabled={pendente}
                onClick={() => fotoRef.current?.click()}
              >
                <Camera aria-hidden /> Foto
              </Button>
              {proximo && (
                <Button
                  className="h-16 min-w-44 flex-1 text-[17px]"
                  disabled={pendente}
                  onClick={() => mudarStatus(proximo.para, `OS em ${STATUS_OS[proximo.para].rotulo.toLowerCase()}.`)}
                >
                  {proximo.rotulo}
                </Button>
              )}
              {podeAguardar && (
                <Button
                  variant="outline"
                  className="h-16 min-w-44 flex-1 border-2 border-alerta text-[17px] text-alerta"
                  disabled={pendente}
                  onClick={() => mudarStatus("aguardando_peca", "OS aguardando peça.")}
                >
                  Aguardando peça
                </Button>
              )}
              {podePronta && (
                <Button
                  className="h-16 min-w-52 flex-[2] bg-sucesso text-lg font-bold hover:bg-sucesso/90"
                  disabled={pendente}
                  onClick={() => mudarStatus("pronto", "OS marcada como pronta.")}
                >
                  <Check aria-hidden /> Marcar OS como pronta
                </Button>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
