"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CampoAssinatura,
  type CampoAssinaturaHandle,
} from "@/components/recebimento/campo-assinatura";
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
import { montarCaminhoAnexo } from "@/lib/recebimento/armazenamento";
import { criarArmazenamentoSupabase } from "@/lib/recebimento/armazenamento-supabase";
import { entregaSchema } from "@/lib/validacoes/os";
import { criarOsGarantiaAction, entregarOsAction } from "@/app/(app)/[empresa]/os/actions";

async function enviarComRetentativa(fn: () => Promise<void>) {
  let ultimo: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error("Falha no envio");
}

type EntregaProps = {
  slug: string;
  empresaId: string;
  osId: string;
  numero: string;
  garantiaDiasPadrao: number;
  podeEditarGarantia: boolean;
};

/** "Entregar": assinatura de retirada + dias de garantia, depois muda para `entregue`. */
export function EntregarOs({
  slug,
  empresaId,
  osId,
  numero,
  garantiaDiasPadrao,
  podeEditarGarantia,
}: EntregaProps) {
  const router = useRouter();
  const pad = React.useRef<CampoAssinaturaHandle>(null);
  const caminho = React.useRef<string | null>(null);
  const [aberto, setAberto] = React.useState(false);
  const [nome, setNome] = React.useState("");
  const [documento, setDocumento] = React.useState("");
  const [dias, setDias] = React.useState(String(garantiaDiasPadrao));
  const [erro, setErro] = React.useState<string | null>(null);
  const [campos, setCampos] = React.useState<Record<string, string>>({});
  const [enviando, setEnviando] = React.useState(false);

  async function confirmar() {
    setErro(null);
    const v = entregaSchema
      .omit({ caminho_imagem: true })
      .safeParse({ nome, documento, garantia_dias: dias });
    if (!v.success) {
      const c: Record<string, string> = {};
      for (const i of v.error.issues) c[String(i.path[0])] = i.message;
      setCampos(c);
      return;
    }
    setCampos({});
    if (!pad.current || pad.current.estaVazio()) {
      setErro("Peça ao cliente para assinar no quadro.");
      return;
    }
    setEnviando(true);
    try {
      if (!caminho.current) {
        const blob = await pad.current.paraBlob();
        const c = montarCaminhoAnexo(empresaId, osId, {
          prefixo: "assinatura-entrega",
          id: crypto.randomUUID(),
          extensao: "png",
        });
        const storage = criarArmazenamentoSupabase();
        await enviarComRetentativa(() => storage.enviar(c, blob, "image/png"));
        caminho.current = c;
      }
      const r = await entregarOsAction(slug, osId, { ...v.data, caminho_imagem: caminho.current });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success(`OS ${numero} entregue.`);
      setAberto(false);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? `Falha ao enviar a assinatura: ${e.message}` : "Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Button onClick={() => setAberto(true)}>Entregar</Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Entregar OS {numero}</DialogTitle>
            <DialogDescription>
              Quem retira o motor assina abaixo. A garantia começa a contar hoje.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ent-nome">Nome de quem retira</Label>
              <Input
                id="ent-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-invalid={!!campos.nome}
              />
              {campos.nome && <span className="text-sm text-perigo">{campos.nome}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ent-doc">CPF, CNPJ ou RG</Label>
              <Input
                id="ent-doc"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                aria-invalid={!!campos.documento}
              />
              {campos.documento && <span className="text-sm text-perigo">{campos.documento}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ent-dias">Garantia (dias)</Label>
              <Input
                id="ent-dias"
                inputMode="numeric"
                value={dias}
                disabled={!podeEditarGarantia}
                onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!campos.garantia_dias}
              />
              {campos.garantia_dias && (
                <span className="text-sm text-perigo">{campos.garantia_dias}</span>
              )}
            </div>
          </div>
          <div>
            <Label>Assinatura de retirada</Label>
            <CampoAssinatura ref={pad} className="mt-1.5 h-48 w-full" />
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => pad.current?.limpar()}>
              Limpar assinatura
            </Button>
          </div>
          {erro && (
            <p className="rounded-lg bg-perigo-suave p-3 text-sm text-perigo" role="alert">
              {erro}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Voltar
            </Button>
            <Button disabled={enviando} onClick={confirmar}>
              {enviando ? "Enviando…" : "Confirmar entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AbrirOsGarantia({ slug, osId }: { slug: string; osId: string }) {
  const router = useRouter();
  const [pendente, iniciar] = React.useTransition();
  return (
    <Button
      variant="outline"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await criarOsGarantiaAction(slug, osId, {});
          if (!r.ok) {
            toast.error(r.erro);
            return;
          }
          toast.success("OS de garantia criada.");
          router.push(`/${slug}/os/${r.dados.id}/recebimento`);
        })
      }
    >
      Abrir OS de garantia
    </Button>
  );
}
