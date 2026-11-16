"use client";

import * as React from "react";
import { CheckCircle2, Copy, FileDown, Loader2, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { BotaoVersao } from "@/components/orcamento/botao-versao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarData } from "@/lib/format";
import { montarMensagemOrcamento } from "@/lib/orcamento/mensagens";
import type { StatusOrcamento } from "@/lib/orcamento/calculos";
import { linkWhatsapp } from "@/lib/validacoes/clientes";
import { CANAIS_RESPOSTA, ROTULO_CANAL } from "@/lib/validacoes/orcamento";
import {
  regenerarLinkAction,
  responderOrcamentoAction,
} from "@/app/(app)/[empresa]/os/[id]/orcamento/actions";

type Props = {
  slug: string;
  osId: string;
  numeroOs: string;
  empresaNome: string;
  nomeCliente: string;
  telefoneCliente: string | null;
  orcamento: {
    id: string;
    versao: number;
    status: StatusOrcamento;
    total: number;
    validade: string | null;
    respondido_por_nome: string | null;
  };
  link: string;
  temLaudo: boolean;
};

/** Pós-envio: link público, WhatsApp, PDF, registro da resposta e nova versão. */
export function EnvioOrcamento({
  slug,
  osId,
  numeroOs,
  empresaNome,
  nomeCliente,
  telefoneCliente,
  orcamento,
  link: linkInicial,
  temLaudo,
}: Props) {
  const [link, setLink] = React.useState(linkInicial);
  const [comLaudo, setComLaudo] = React.useState(temLaudo);
  const [pendente, executar] = React.useTransition();
  const [responder, setResponder] = React.useState<boolean | null>(null);

  const mensagem = montarMensagemOrcamento({
    nomeCliente,
    numeroOs,
    empresa: empresaNome,
    total: orcamento.total,
    validade: orcamento.validade,
    link,
  });
  const wa = linkWhatsapp(telefoneCliente, mensagem);
  const pdf = `/${slug}/os/${osId}/orcamento/pdf${comLaudo ? "?laudo=1" : ""}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-borda bg-superficie p-4" aria-label="Envio">
      <header>
        <h2 className="text-lg font-bold">
          Versão {orcamento.versao} {rotuloEstado(orcamento.status)}
        </h2>
        {orcamento.validade && (
          <p className="text-sm text-texto-secundario">Válido até {formatarData(orcamento.validade)}</p>
        )}
      </header>

      {orcamento.status === "enviado" && (
        <>
          <div className="space-y-1">
            <Label htmlFor="link-publico">Link para o cliente (sem login)</Label>
            <div className="flex gap-2">
              <Input id="link-publico" readOnly value={link} onFocus={(e) => e.target.select()} />
              <Button type="button" variant="secondary" onClick={copiar}>
                <Copy aria-hidden /> Copiar
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {wa ? (
              <Button asChild>
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden /> Enviar no WhatsApp
                </a>
              </Button>
            ) : (
              <p className="text-sm text-texto-secundario">
                Cliente sem WhatsApp válido: copie o link e envie por outro canal.
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={pendente}
              onClick={() =>
                executar(async () => {
                  if (!window.confirm("O link atual deixará de funcionar. Gerar um novo?")) return;
                  const r = await regenerarLinkAction(slug, osId);
                  if (r.ok) {
                    setLink(r.dados.link);
                    toast.success("Novo link gerado; o anterior foi revogado.");
                  } else toast.error(r.erro);
                })
              }
            >
              <RefreshCw aria-hidden /> Revogar e gerar novo link
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-borda pt-3 sm:flex-row sm:items-center">
        <Button asChild variant="secondary">
          <a href={pdf} target="_blank" rel="noopener noreferrer">
            <FileDown aria-hidden /> PDF do orçamento
          </a>
        </Button>
        {temLaudo && (
          <label className="flex min-h-11 items-center gap-2 text-[15px]">
            <input
              type="checkbox"
              className="size-5 accent-primaria"
              checked={comLaudo}
              onChange={(e) => setComLaudo(e.target.checked)}
            />
            Incluir laudo
          </label>
        )}
      </div>

      {orcamento.status === "enviado" && (
        <div className="space-y-2 border-t border-borda pt-3">
          <p className="text-[15px] font-semibold">O cliente respondeu fora do link?</p>
          <p className="text-sm text-texto-secundario">
            Registre a aprovação ou reprovação combinada no balcão, por telefone ou WhatsApp.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => setResponder(true)}>
              <CheckCircle2 aria-hidden /> Registrar aprovação
            </Button>
            <Button type="button" variant="secondary" onClick={() => setResponder(false)}>
              <XCircle aria-hidden /> Registrar reprovação
            </Button>
          </div>
        </div>
      )}

      {orcamento.status !== "rascunho" && (
        <div className="border-t border-borda pt-3">
          <BotaoVersao
            slug={slug}
            osId={osId}
            rotulo="Criar nova versão"
            variante="secondary"
            confirmar={
              orcamento.status === "aprovado"
                ? "Este orçamento já foi aprovado. Uma nova versão cancela a aprovação atual. Continuar?"
                : "A versão atual será marcada como substituída. Continuar?"
            }
          />
        </div>
      )}

      <RespostaDialog
        aberto={responder !== null}
        aprovar={responder === true}
        onFechar={() => setResponder(null)}
        slug={slug}
        osId={osId}
        orcamentoId={orcamento.id}
        nomeSugerido={nomeCliente}
      />
    </section>
  );
}

function rotuloEstado(s: StatusOrcamento) {
  switch (s) {
    case "enviado":
      return "enviada, aguardando resposta";
    case "aprovado":
      return "aprovada";
    case "reprovado":
      return "reprovada";
    case "substituido":
      return "substituída";
    default:
      return "em rascunho";
  }
}

function RespostaDialog({
  aberto,
  aprovar,
  onFechar,
  slug,
  osId,
  orcamentoId,
  nomeSugerido,
}: {
  aberto: boolean;
  aprovar: boolean;
  onFechar: () => void;
  slug: string;
  osId: string;
  orcamentoId: string;
  nomeSugerido: string;
}) {
  const [nome, setNome] = React.useState(nomeSugerido);
  const [canal, setCanal] = React.useState<(typeof CANAIS_RESPOSTA)[number]>("presencial");
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, executar] = React.useTransition();

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aprovar ? "Registrar aprovação" : "Registrar reprovação"}</DialogTitle>
          <DialogDescription>
            Fica gravado quem respondeu, o canal e a data. Isso muda o status da OS.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="resp-nome">Nome de quem respondeu</Label>
            <Input id="resp-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="resp-canal">Canal</Label>
            <select
              id="resp-canal"
              value={canal}
              onChange={(e) => setCanal(e.target.value as typeof canal)}
              className="h-11 w-full rounded-lg border border-input bg-superficie px-3 text-[15px]"
            >
              {CANAIS_RESPOSTA.map((c) => (
                <option key={c} value={c}>
                  {ROTULO_CANAL[c]}
                </option>
              ))}
            </select>
          </div>
          {erro && (
            <p role="alert" className="text-sm text-perigo">
              {erro}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={aprovar ? "default" : "destructive"}
            disabled={pendente}
            onClick={() =>
              executar(async () => {
                const r = await responderOrcamentoAction(slug, osId, {
                  orcamento_id: orcamentoId,
                  aprovar,
                  nome,
                  canal,
                });
                if (r.ok) {
                  toast.success(aprovar ? "Aprovação registrada." : "Reprovação registrada.");
                  onFechar();
                } else setErro(r.erro);
              })
            }
          >
            {pendente && <Loader2 className="animate-spin" aria-hidden />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
