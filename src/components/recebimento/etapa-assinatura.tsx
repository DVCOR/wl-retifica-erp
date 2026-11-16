"use client";

import * as React from "react";
import { AlertCircle, ChevronLeft, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { montarCaminhoAnexo, type ArmazenamentoArquivos } from "@/lib/recebimento/armazenamento";
import { criarArmazenamentoSupabase } from "@/lib/recebimento/armazenamento-supabase";
import { contarDivergencias, type ItemChecklist } from "@/lib/recebimento/divergencias";
import { assinaturaSchema } from "@/lib/validacoes/recebimento";
import { finalizarRecebimentoAction } from "@/app/(app)/[empresa]/os/[id]/recebimento/actions";
import { CampoAssinatura, type CampoAssinaturaHandle } from "./campo-assinatura";
import { ResumoDivergencias } from "./resumo-divergencias";

type EtapaAssinaturaProps = {
  slug: string;
  empresaId: string;
  osId: string;
  itens: ItemChecklist[];
  geraisGravadas: number;
  /** Fotos ainda subindo ou com falha: bloqueiam a conclusão. */
  fotosPendentes: number;
  /** Itens do checklist ainda sem salvar. */
  itensSemSalvar: number;
  armazenamento?: ArmazenamentoArquivos;
  aoVoltar: () => void;
  aoFinalizar: () => void;
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function enviarComRetentativa(fn: () => Promise<void>, tentativas = 3) {
  let ultimo: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      await fn();
      return;
    } catch (e) {
      ultimo = e;
      await espera(1000 * (i + 1));
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error("Falha no envio da assinatura");
}

/** Etapa 5: resumo das divergências, assinatura, nome e documento de quem entrega. */
export function EtapaAssinatura({
  slug,
  empresaId,
  osId,
  itens,
  geraisGravadas,
  fotosPendentes,
  itensSemSalvar,
  armazenamento,
  aoVoltar,
  aoFinalizar,
}: EtapaAssinaturaProps) {
  const pad = React.useRef<CampoAssinaturaHandle>(null);
  const caminhoEnviado = React.useRef<string | null>(null);
  const [nome, setNome] = React.useState("");
  const [documento, setDocumento] = React.useState("");
  const [vazio, setVazio] = React.useState(true);
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [camposErro, setCamposErro] = React.useState<Record<string, string>>({});

  const bloqueio =
    fotosPendentes > 0
      ? "Aguarde as fotos terminarem de enviar."
      : itensSemSalvar > 0
        ? "Há itens do checklist sem salvar. Volte e toque em “Tentar de novo”."
        : null;

  async function confirmar() {
    setErro(null);
    const validacao = assinaturaSchema
      .pick({ nome: true, documento: true })
      .safeParse({ nome, documento });
    if (!validacao.success) {
      const campos: Record<string, string> = {};
      for (const i of validacao.error.issues) campos[String(i.path[0])] = i.message;
      setCamposErro(campos);
      return;
    }
    setCamposErro({});
    if (!pad.current || pad.current.estaVazio()) {
      setErro("Peça ao cliente para assinar no quadro.");
      return;
    }
    setEnviando(true);
    try {
      if (!caminhoEnviado.current) {
        const blob = await pad.current.paraBlob();
        const caminho = montarCaminhoAnexo(empresaId, osId, {
          prefixo: "assinatura-recebimento",
          id: crypto.randomUUID(),
          extensao: "png",
        });
        const storage = armazenamento ?? criarArmazenamentoSupabase();
        await enviarComRetentativa(() => storage.enviar(caminho, blob, "image/png"));
        caminhoEnviado.current = caminho;
      }
      const r = await finalizarRecebimentoAction(slug, osId, {
        nome: validacao.data.nome,
        documento: validacao.data.documento,
        caminho_imagem: caminhoEnviado.current,
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aoFinalizar();
    } catch (e) {
      setErro(
        e instanceof Error
          ? `Não foi possível enviar a assinatura: ${e.message}. Confira a conexão e tente de novo.`
          : "Não foi possível concluir. Tente de novo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const divergencias = contarDivergencias(itens);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4 md:p-5">
          <div>
            <h2 className="text-[22px] font-bold text-texto">Resumo para o cliente</h2>
            <p className="mt-0.5 text-sm text-texto-secundario">
              {divergencias === 0
                ? "Sem divergências."
                : `${divergencias} divergência(s) registrada(s).`}{" "}
              {geraisGravadas} foto(s) gerais.
            </p>
          </div>
          <ResumoDivergencias itens={itens} />
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-4 md:p-5">
          <div>
            <h2 className="text-[22px] font-bold text-texto">Assinatura de quem entrega</h2>
            <p className="mt-0.5 flex items-start gap-1.5 text-sm text-texto-secundario">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              Declaro que conferi o resumo acima e que o motor foi entregue nas condições descritas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="assin-nome">Nome completo</Label>
              <Input
                id="assin-nome"
                className="h-12"
                autoComplete="off"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-invalid={Boolean(camposErro.nome)}
              />
              {camposErro.nome && <p className="text-sm text-perigo">{camposErro.nome}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="assin-doc">CPF, CNPJ ou RG</Label>
              <Input
                id="assin-doc"
                className="h-12"
                autoComplete="off"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                aria-invalid={Boolean(camposErro.documento)}
              />
              {camposErro.documento && (
                <p className="text-sm text-perigo">{camposErro.documento}</p>
              )}
            </div>
          </div>

          <CampoAssinatura ref={pad} aoMudar={setVazio} />

          {(erro || bloqueio) && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-perigo-suave px-4 py-3 text-[15px] font-medium text-perigo"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
              {erro ?? bloqueio}
            </p>
          )}
        </section>
      </div>

      <footer className="sticky bottom-[76px] z-30 flex items-center justify-between gap-3 rounded-xl border border-borda bg-superficie px-4 py-3 shadow-sm md:bottom-3 lg:px-6">
        <Button
          type="button"
          variant="secondary"
          size="bancada"
          className="h-[52px]"
          onClick={aoVoltar}
          disabled={enviando}
        >
          <ChevronLeft aria-hidden />
          Fotos
        </Button>
        <Button
          type="button"
          size="bancada"
          className="h-[52px] rounded-xl"
          onClick={confirmar}
          disabled={enviando || vazio || Boolean(bloqueio)}
        >
          {enviando && <Loader2 className="animate-spin" aria-hidden />}
          Confirmar recebimento
        </Button>
      </footer>
    </div>
  );
}
