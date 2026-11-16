"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { corrigirChecklistAction } from "@/app/(app)/[empresa]/os/actions";

export type ItemChecklistCorrigivel = {
  id: string;
  grupo: string;
  descricao: string;
  status: "ok" | "danificado" | "ausente" | "na";
  quantidade: number | null;
  observacao: string | null;
  exige_quantidade: boolean;
};

const ROTULOS_STATUS: Record<ItemChecklistCorrigivel["status"], string> = {
  ok: "OK",
  danificado: "Danificado",
  ausente: "Ausente",
  na: "Não se aplica",
};

type Props = {
  slug: string;
  osId: string;
  itens: ItemChecklistCorrigivel[];
  /** Item já escolhido (botão da divergência); sem ele o diálogo pede o item. */
  itemId?: string;
  rotulo?: string;
};

/** Correção de item do checklist depois do recebimento (só dono; motivo obrigatório). */
export function CorrigirChecklist({ slug, osId, itens, itemId, rotulo = "Corrigir item" }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [pendente, iniciar] = React.useTransition();
  const [selecionado, setSelecionado] = React.useState(itemId ?? "");
  const [status, setStatus] = React.useState<ItemChecklistCorrigivel["status"]>("ok");
  const [quantidade, setQuantidade] = React.useState("");
  const [observacao, setObservacao] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [erros, setErros] = React.useState<Record<string, string[] | undefined>>({});

  const item = itens.find((i) => i.id === selecionado) ?? null;

  function carregar(id: string) {
    const i = itens.find((x) => x.id === id);
    setSelecionado(id);
    setStatus(i?.status ?? "ok");
    setQuantidade(i?.quantidade === null || i?.quantidade === undefined ? "" : String(i.quantidade));
    setObservacao(i?.observacao ?? "");
  }

  function abrir(o: boolean) {
    setAberto(o);
    if (o) {
      carregar(itemId ?? "");
      setMotivo("");
      setErros({});
    }
  }

  function salvar() {
    if (!item) {
      setErros({ item_id: ["Escolha o item"] });
      return;
    }
    const qtd = quantidade.trim() === "" ? null : Number(quantidade.replace(",", "."));
    iniciar(async () => {
      const r = await corrigirChecklistAction(slug, osId, {
        item_id: item.id,
        status,
        quantidade: qtd !== null && Number.isNaN(qtd) ? -1 : qtd,
        observacao,
        motivo,
      });
      if (!r.ok) {
        setErros(r.campos ?? {});
        toast.error(r.erro);
        return;
      }
      toast.success("Checklist corrigido.");
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => abrir(true)}>
        {rotulo}
      </Button>
      <Dialog open={aberto} onOpenChange={abrir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir item do checklist</DialogTitle>
            <DialogDescription>
              O recebimento já foi concluído. A correção fica registrada na auditoria com o motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {itemId ? (
              <p className="text-[15px]">
                <span className="font-semibold">{item?.descricao}</span>{" "}
                <span className="text-texto-secundario">({item?.grupo})</span>
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="corrigir-item">Item</Label>
                <Select value={selecionado} onValueChange={carregar}>
                  <SelectTrigger id="corrigir-item" className="min-h-11" aria-invalid={!!erros.item_id}>
                    <SelectValue placeholder="Escolha o item" />
                  </SelectTrigger>
                  <SelectContent>
                    {itens.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.grupo} · {i.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erros.item_id && <p className="text-sm text-perigo">{erros.item_id[0]}</p>}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="corrigir-status">Situação</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ItemChecklistCorrigivel["status"])}>
                <SelectTrigger id="corrigir-status" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROTULOS_STATUS) as ItemChecklistCorrigivel["status"][]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {ROTULOS_STATUS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {item && (item.exige_quantidade || item.quantidade !== null) && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="corrigir-qtd">Quantidade</Label>
                <Input
                  id="corrigir-qtd"
                  inputMode="decimal"
                  className="min-h-11"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  aria-invalid={!!erros.quantidade}
                />
                {erros.quantidade && <p className="text-sm text-perigo">{erros.quantidade[0]}</p>}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="corrigir-obs">Observação</Label>
              <Textarea id="corrigir-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="corrigir-motivo">Motivo da correção *</Label>
              <Textarea
                id="corrigir-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: cliente trouxe a peça depois"
                aria-invalid={!!erros.motivo}
              />
              {erros.motivo && (
                <p className="text-sm text-perigo" role="alert">
                  {erros.motivo[0]}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setAberto(false)}>
              Voltar
            </Button>
            <Button className="min-h-11" disabled={pendente} onClick={salvar}>
              Salvar correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
