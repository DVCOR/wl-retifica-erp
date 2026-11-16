"use client";

import * as React from "react";
import { toast } from "sonner";
import { comprimirImagem } from "@/lib/recebimento/compressao";
import { montarCaminhoAnexo, type ArmazenamentoArquivos } from "@/lib/recebimento/armazenamento";
import { criarArmazenamentoSupabase } from "@/lib/recebimento/armazenamento-supabase";
import { FilaUpload, type EstadoUpload } from "@/lib/recebimento/fila-upload";
import {
  registrarAnexoAction,
  removerAnexoAction,
} from "@/app/(app)/[empresa]/os/[id]/recebimento/actions";

export type FotoRegistrada = {
  id: string;
  url: string | null;
  checklistItemId: string | null;
};

export type FotoView = {
  chave: string;
  url: string | null;
  checklistItemId: string | null;
  estado: EstadoUpload;
  erro: string | null;
  /** Presente quando ainda está na fila (não gravada). */
  tarefaId?: string;
  /** Presente quando já está gravada. */
  anexoId?: string;
};

type MetaFoto = { caminho: string; checklistItemId: string | null; previewUrl: string };

type Opcoes = {
  slug: string;
  empresaId: string;
  osId: string;
  iniciais: FotoRegistrada[];
  armazenamento?: ArmazenamentoArquivos;
};

/**
 * Fotos da OS: lista gravada + fila de upload (com retentativa). A foto aparece
 * na hora (miniatura local) e muda de estado conforme o envio.
 */
export function useFotosOs({ slug, empresaId, osId, iniciais, armazenamento }: Opcoes) {
  const [registradas, setRegistradas] = React.useState<FotoRegistrada[]>(iniciais);
  const [previews, setPreviews] = React.useState<Record<string, string>>({});

  const [fila] = React.useState(
    () =>
      new FilaUpload<MetaFoto>({
        enviar: async (tarefa) => {
          const storage = armazenamento ?? criarArmazenamentoSupabase();
          await storage.enviar(tarefa.meta.caminho, tarefa.arquivo, "image/jpeg");
          const r = await registrarAnexoAction(slug, osId, {
            caminho: tarefa.meta.caminho,
            checklist_item_id: tarefa.meta.checklistItemId,
          });
          if (!r.ok) throw new Error(r.erro);
          const anexoId = r.dados.id;
          setRegistradas((atual) =>
            atual.some((f) => f.id === anexoId)
              ? atual
              : [
                  ...atual,
                  {
                    id: anexoId,
                    url: tarefa.meta.previewUrl,
                    checklistItemId: tarefa.meta.checklistItemId,
                  },
                ],
          );
        },
      }),
  );

  const tarefas = React.useSyncExternalStore(fila.assinar, fila.obterEstado, fila.obterEstado);

  React.useEffect(() => {
    const aoVoltarOnline = () => fila.retentarTodas();
    window.addEventListener("online", aoVoltarOnline);
    return () => window.removeEventListener("online", aoVoltarOnline);
  }, [fila]);

  const pendentes = tarefas.filter((t) => t.estado !== "enviado").length;

  React.useEffect(() => {
    if (pendentes === 0) return;
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [pendentes]);

  const adicionarArquivos = React.useCallback(
    async (arquivos: File[], checklistItemId: string | null) => {
      for (const arquivo of arquivos) {
        try {
          const blob = await comprimirImagem(arquivo);
          const id = crypto.randomUUID();
          const caminho = montarCaminhoAnexo(empresaId, osId, {
            id,
            extensao: "jpg",
            prefixo: checklistItemId ? "item" : "geral",
          });
          const previewUrl = URL.createObjectURL(blob);
          setPreviews((p) => ({ ...p, [id]: previewUrl }));
          fila.adicionar(id, blob, { caminho, checklistItemId, previewUrl });
        } catch {
          toast.error("Não foi possível ler essa foto. Tire outra.");
        }
      }
    },
    [empresaId, osId, fila],
  );

  const retentar = React.useCallback((tarefaId: string) => fila.retentar(tarefaId), [fila]);

  const remover = React.useCallback(
    async (foto: FotoView) => {
      if (foto.tarefaId) {
        fila.remover(foto.tarefaId);
        return;
      }
      if (!foto.anexoId) return;
      const anexoId = foto.anexoId;
      const anterior = registradas;
      setRegistradas((atual) => atual.filter((f) => f.id !== anexoId));
      const r = await removerAnexoAction(slug, osId, anexoId);
      if (!r.ok) {
        setRegistradas(anterior);
        toast.error(r.erro);
      }
    },
    [fila, registradas, slug, osId],
  );

  const fotos: FotoView[] = [
    ...registradas.map((r): FotoView => ({
      chave: r.id,
      anexoId: r.id,
      url: r.url,
      checklistItemId: r.checklistItemId,
      estado: "enviado",
      erro: null,
    })),
    ...tarefas
      .filter((t) => t.estado !== "enviado")
      .map((t): FotoView => ({
        chave: t.id,
        tarefaId: t.id,
        url: previews[t.id] ?? null,
        checklistItemId: t.meta.checklistItemId,
        estado: t.estado,
        erro: t.erro,
      })),
  ];

  const geraisGravadas = registradas.filter((f) => f.checklistItemId === null).length;

  return { fotos, geraisGravadas, pendentes, adicionarArquivos, retentar, remover };
}
