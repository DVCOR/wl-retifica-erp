"use client";

import * as React from "react";
import { CheckCircle2, ClipboardPlus, Loader2, Lightbulb, Pencil, Trash2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SeletorItemCatalogo, type ItemCatalogo } from "@/components/catalogo/seletor-item-catalogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CapturaFoto } from "@/components/recebimento/captura-foto";
import { calcularConformidade, formatarFaixa, formatarNumero, MODELOS_MEDICAO } from "@/lib/orcamento/medicao";
import { montarCaminhoAnexo } from "@/lib/recebimento/armazenamento";
import { criarArmazenamentoSupabase } from "@/lib/recebimento/armazenamento-supabase";
import { comprimirImagem } from "@/lib/recebimento/compressao";
import { parseDecimalBR } from "@/lib/validacoes/clientes";
import { cn } from "@/lib/utils";
import {
  registrarFotoMedicaoAction,
  removerFotoMedicaoAction,
  removerMedicaoAction,
  salvarMedicaoAction,
  sugerirItemAction,
} from "@/app/(app)/[empresa]/os/[id]/laudo/actions";

export type MedicaoView = {
  id: string;
  componente: string;
  descricao: string;
  valor: number | null;
  valor_texto: string | null;
  unidade: string | null;
  minimo: number | null;
  maximo: number | null;
  conforme: boolean | null;
  observacao: string | null;
  membro_nome: string | null;
  fotos: { id: string; url: string | null }[];
};

type Props = {
  slug: string;
  empresaId: string;
  osId: string;
  tabelaPrecoId: string | null;
  medicoes: MedicaoView[];
  podeRegistrar: boolean;
  podeSugerir: boolean;
};

const ALVO = "h-12 text-base";

export function LaudoMedicoes({
  slug,
  empresaId,
  osId,
  tabelaPrecoId,
  medicoes,
  podeRegistrar,
  podeSugerir,
}: Props) {
  const [editando, setEditando] = React.useState<MedicaoView | "nova" | null>(null);
  const [sugerindo, setSugerindo] = React.useState<MedicaoView | null>(null);

  return (
    <div className="space-y-4">
      {podeRegistrar && (
        <Button type="button" size="bancada" className="w-full sm:w-auto" onClick={() => setEditando("nova")}>
          <ClipboardPlus aria-hidden /> Nova medição
        </Button>
      )}

      {medicoes.length === 0 ? (
        <EmptyState
          icone={<ClipboardPlus />}
          titulo="Nenhuma medição registrada"
          descricao={
            podeRegistrar
              ? "Registre as medições após a desmontagem: o sistema marca conforme ou não conforme."
              : "O técnico ainda não registrou medições para esta OS."
          }
        />
      ) : (
        <ul className="space-y-3">
          {medicoes.map((m) => (
            <CartaoMedicao
              key={m.id}
              m={m}
              slug={slug}
              empresaId={empresaId}
              osId={osId}
              podeRegistrar={podeRegistrar}
              podeSugerir={podeSugerir}
              onEditar={() => setEditando(m)}
              onSugerir={() => setSugerindo(m)}
            />
          ))}
        </ul>
      )}

      {editando && (
        <FormMedicao
          key={editando === "nova" ? "nova" : editando.id}
          slug={slug}
          osId={osId}
          medicao={editando === "nova" ? null : editando}
          onFechar={() => setEditando(null)}
        />
      )}
      {sugerindo && (
        <DialogSugestao
          slug={slug}
          empresaId={empresaId}
          osId={osId}
          tabelaPrecoId={tabelaPrecoId}
          medicao={sugerindo}
          onFechar={() => setSugerindo(null)}
        />
      )}
    </div>
  );
}

export function SeloConformidade({ conforme }: { conforme: boolean | null }) {
  if (conforme === null) return <Badge variant="contorno">Sem faixa</Badge>;
  return conforme ? (
    <Badge variant="sucesso">
      <CheckCircle2 aria-hidden /> Conforme
    </Badge>
  ) : (
    <Badge variant="perigo">
      <XCircle aria-hidden /> Não conforme
    </Badge>
  );
}

function CartaoMedicao({
  m,
  slug,
  empresaId,
  osId,
  podeRegistrar,
  podeSugerir,
  onEditar,
  onSugerir,
}: {
  m: MedicaoView;
  slug: string;
  empresaId: string;
  osId: string;
  podeRegistrar: boolean;
  podeSugerir: boolean;
  onEditar: () => void;
  onSugerir: () => void;
}) {
  const [pendente, executar] = React.useTransition();
  const [enviando, setEnviando] = React.useState(0);
  const faixa = formatarFaixa(m.minimo, m.maximo, m.unidade);
  const valor =
    m.valor !== null ? `${formatarNumero(m.valor)}${m.unidade ? ` ${m.unidade}` : ""}` : (m.valor_texto ?? "—");

  async function anexar(arquivos: File[]) {
    setEnviando((n) => n + arquivos.length);
    const storage = criarArmazenamentoSupabase();
    for (const arquivo of arquivos) {
      try {
        const jpeg = await comprimirImagem(arquivo);
        const caminho = montarCaminhoAnexo(empresaId, osId, {
          prefixo: "medicao",
          id: crypto.randomUUID(),
          extensao: "jpg",
        });
        await storage.enviar(caminho, jpeg, "image/jpeg");
        const r = await registrarFotoMedicaoAction(slug, osId, { medicao_id: m.id, caminho });
        if (!r.ok) throw new Error(r.erro);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao enviar a foto.");
      } finally {
        setEnviando((n) => n - 1);
      }
    }
  }

  return (
    <li
      className={cn(
        "rounded-xl border bg-superficie p-4",
        m.conforme === false ? "border-perigo border-l-4" : "border-borda",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-texto-secundario">{m.componente}</p>
          <p className="text-[17px] font-semibold">{m.descricao}</p>
        </div>
        <SeloConformidade conforme={m.conforme} />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{valor}</p>
      {faixa && <p className="text-sm text-texto-secundario">Faixa especificada: {faixa}</p>}
      {m.observacao && <p className="mt-2 text-[15px]">{m.observacao}</p>}
      {m.membro_nome && <p className="mt-1 text-xs text-texto-secundario">Registrado por {m.membro_nome}</p>}

      {(m.fotos.length > 0 || enviando > 0) && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {m.fotos.map((f) => (
            <li key={f.id} className="relative">
              {f.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária
                <img src={f.url} alt={`Foto de ${m.descricao}`} className="aspect-[4/3] w-full rounded-lg object-cover" />
              ) : (
                <div className="aspect-[4/3] w-full rounded-lg bg-fundo" />
              )}
              {podeRegistrar && (
                <button
                  type="button"
                  aria-label="Apagar foto"
                  className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-preto/70 text-white"
                  onClick={() =>
                    executar(async () => {
                      const r = await removerFotoMedicaoAction(slug, osId, f.id);
                      if (!r.ok) toast.error(r.erro);
                    })
                  }
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: enviando }).map((_, i) => (
            <li key={`env-${i}`} className="flex aspect-[4/3] items-center justify-center rounded-lg bg-fundo">
              <Loader2 className="size-5 animate-spin text-texto-secundario" aria-label="Enviando foto" />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {podeRegistrar && (
          <>
            <CapturaFoto rotulo={`Adicionar foto a ${m.descricao}`} aoCapturar={anexar} texto="Foto" variante="secundario" galeria />
            <Button type="button" variant="secondary" className="h-12" onClick={onEditar}>
              <Pencil aria-hidden /> Editar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-12"
              disabled={pendente}
              onClick={() =>
                executar(async () => {
                  if (!window.confirm("Apagar esta medição e suas fotos?")) return;
                  const r = await removerMedicaoAction(slug, osId, m.id);
                  if (!r.ok) toast.error(r.erro);
                })
              }
            >
              <Trash2 aria-hidden /> Apagar
            </Button>
          </>
        )}
        {podeSugerir && m.conforme === false && (
          <Button type="button" className="h-12" onClick={onSugerir}>
            <Lightbulb aria-hidden /> Sugerir item de orçamento
          </Button>
        )}
      </div>
    </li>
  );
}

function FormMedicao({
  slug,
  osId,
  medicao,
  onFechar,
}: {
  slug: string;
  osId: string;
  medicao: MedicaoView | null;
  onFechar: () => void;
}) {
  const [tipo, setTipo] = React.useState<"numerica" | "teste">(
    medicao && medicao.valor === null && medicao.valor_texto ? "teste" : "numerica",
  );
  const [componente, setComponente] = React.useState(medicao?.componente ?? "");
  const [descricao, setDescricao] = React.useState(medicao?.descricao ?? "");
  const [valor, setValor] = React.useState(medicao?.valor != null ? formatarNumero(medicao.valor) : "");
  const [unidade, setUnidade] = React.useState(medicao?.unidade ?? "mm");
  const [minimo, setMinimo] = React.useState(medicao?.minimo != null ? formatarNumero(medicao.minimo) : "");
  const [maximo, setMaximo] = React.useState(medicao?.maximo != null ? formatarNumero(medicao.maximo) : "");
  const [aprovado, setAprovado] = React.useState<boolean | null>(
    medicao?.valor_texto ? medicao.conforme : null,
  );
  const [observacao, setObservacao] = React.useState(medicao?.observacao ?? "");
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, executar] = React.useTransition();

  const nv = parseDecimalBR(valor);
  const nmin = parseDecimalBR(minimo);
  const nmax = parseDecimalBR(maximo);
  const previa =
    tipo === "teste"
      ? aprovado
      : calcularConformidade(
          Number.isNaN(nv) ? null : nv,
          Number.isNaN(nmin) ? null : nmin,
          Number.isNaN(nmax) ? null : nmax,
        );

  function salvar() {
    setErro(null);
    executar(async () => {
      const r = await salvarMedicaoAction(slug, osId, medicao?.id ?? null, {
        componente,
        descricao,
        tipo,
        valor: tipo === "numerica" ? nv : null,
        unidade: tipo === "numerica" ? unidade : "",
        minimo: tipo === "numerica" ? nmin : null,
        maximo: tipo === "numerica" ? nmax : null,
        aprovado: tipo === "teste" ? aprovado : null,
        observacao,
      });
      if (r.ok) {
        toast.success(
          r.dados.conforme === false ? "Medição salva: não conforme." : "Medição salva.",
        );
        onFechar();
      } else setErro(r.campos ? Object.values(r.campos).flat().filter(Boolean).join(" ") : r.erro);
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{medicao ? "Editar medição" : "Nova medição"}</DialogTitle>
          <DialogDescription>Valor, unidade e faixa: o sistema marca conforme ou não conforme.</DialogDescription>
        </DialogHeader>

        {!medicao && (
          <div className="flex flex-wrap gap-2" aria-label="Modelos de medição">
            {MODELOS_MEDICAO.map((mod) => (
              <button
                key={`${mod.componente}-${mod.descricao}`}
                type="button"
                className="min-h-12 rounded-full border border-borda-forte bg-superficie px-4 text-sm font-medium hover:bg-fundo"
                onClick={() => {
                  setComponente(mod.componente);
                  setDescricao(mod.descricao);
                  setTipo(mod.tipo);
                  if (mod.unidade) setUnidade(mod.unidade);
                }}
              >
                {mod.descricao}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="med-comp">Componente</Label>
              <Input id="med-comp" className={ALVO} value={componente} onChange={(e) => setComponente(e.target.value)} placeholder="Ex.: Cabeçote" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="med-desc">Medição</Label>
              <Input id="med-desc" className={ALVO} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Empenamento da face" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de medição">
            {(["numerica", "teste"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={tipo === t ? "escuro" : "secondary"}
                className="h-12"
                aria-pressed={tipo === t}
                onClick={() => setTipo(t)}
              >
                {t === "numerica" ? "Valor medido" : "Teste aprovado/reprovado"}
              </Button>
            ))}
          </div>

          {tipo === "numerica" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="med-valor">Valor</Label>
                <Input id="med-valor" className={ALVO} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-un">Unidade</Label>
                <Input id="med-un" className={ALVO} value={unidade} onChange={(e) => setUnidade(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-min">Mínimo</Label>
                <Input id="med-min" className={ALVO} inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-max">Máximo</Label>
                <Input id="med-max" className={ALVO} inputMode="decimal" value={maximo} onChange={(e) => setMaximo(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Resultado do teste">
              <Button type="button" className="h-14" variant={aprovado === true ? "default" : "secondary"} aria-pressed={aprovado === true} onClick={() => setAprovado(true)}>
                <CheckCircle2 aria-hidden /> Aprovado
              </Button>
              <Button type="button" className="h-14" variant={aprovado === false ? "destructive" : "secondary"} aria-pressed={aprovado === false} onClick={() => setAprovado(false)}>
                <XCircle aria-hidden /> Reprovado
              </Button>
            </div>
          )}

          <p className="flex items-center gap-2 text-sm" aria-live="polite">
            Resultado: <SeloConformidade conforme={previa} />
          </p>

          <div className="space-y-1">
            <Label htmlFor="med-obs">Observação</Label>
            <Textarea id="med-obs" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          {erro && (
            <p role="alert" className="text-sm text-perigo">
              {erro}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" className="h-12" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" className="h-12" disabled={pendente} onClick={salvar}>
            {pendente && <Loader2 className="animate-spin" aria-hidden />}
            Salvar medição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogSugestao({
  slug,
  empresaId,
  osId,
  tabelaPrecoId,
  medicao,
  onFechar,
}: {
  slug: string;
  empresaId: string;
  osId: string;
  tabelaPrecoId: string | null;
  medicao: MedicaoView;
  onFechar: () => void;
}) {
  const [item, setItem] = React.useState<ItemCatalogo | null>(null);
  const [quantidade, setQuantidade] = React.useState("1");
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, executar] = React.useTransition();
  const qtd = parseDecimalBR(quantidade);

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sugerir item de orçamento</DialogTitle>
          <DialogDescription>
            A medição &ldquo;{medicao.descricao}&rdquo; ficou fora da faixa. O balcão revisa a
            sugestão antes de enviar ao cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <SeletorItemCatalogo
            empresaId={empresaId}
            tabelaPrecoId={tabelaPrecoId}
            tipos={["servico", "peca"]}
            onSelecionar={(i) => setItem(i)}
            placeholder="Buscar serviço ou peça (ex.: retificar face)"
          />
          {item && (
            <p className="rounded-lg bg-fundo px-3 py-2 text-[15px]">
              <strong>{item.descricao}</strong>
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="sug-qtd">Quantidade</Label>
            <Input id="sug-qtd" className={ALVO} inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
          {erro && (
            <p role="alert" className="text-sm text-perigo">
              {erro}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" className="h-12" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12"
            disabled={pendente || !item || !qtd || Number.isNaN(qtd)}
            onClick={() =>
              executar(async () => {
                if (!item || item.tipo === "kit" || !qtd) return;
                const r = await sugerirItemAction(slug, osId, {
                  medicao_id: medicao.id,
                  tipo: item.tipo,
                  item_id: item.id,
                  descricao: item.descricao,
                  quantidade: qtd,
                });
                if (r.ok) {
                  toast.success("Sugestão enviada ao balcão.");
                  onFechar();
                } else setErro(r.erro);
              })
            }
          >
            {pendente && <Loader2 className="animate-spin" aria-hidden />}
            Enviar sugestão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
