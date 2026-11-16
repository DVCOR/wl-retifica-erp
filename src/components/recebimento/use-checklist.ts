"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ItemChecklist, StatusItem } from "@/lib/recebimento/divergencias";
import {
  atualizarItemChecklistAction,
  marcarGrupoAction,
} from "@/app/(app)/[empresa]/os/[id]/recebimento/actions";

export type EstadoSalvar = "salvando" | "erro";

export type PatchItem = {
  status?: StatusItem;
  quantidade?: number | null;
  observacao?: string | null;
};

/**
 * Estado do checklist com salvamento otimista: a tela muda na hora, a gravação
 * acontece em segundo plano (em série por item) e falhas ficam marcadas no item
 * com "tentar de novo".
 */
export function useChecklist(slug: string, osId: string, iniciais: ItemChecklist[]) {
  const [itens, setItens] = React.useState<ItemChecklist[]>(iniciais);
  const [salvar, setSalvar] = React.useState<Record<string, EstadoSalvar>>({});
  // alterações ainda não confirmadas pelo servidor, por item
  const pendente = React.useRef(new Map<string, PatchItem>());
  const cadeia = React.useRef(new Map<string, Promise<void>>());

  const gravar = React.useCallback(
    (itemId: string) => {
      const anterior = cadeia.current.get(itemId) ?? Promise.resolve();
      const proxima = anterior.then(async () => {
        const patch = pendente.current.get(itemId);
        if (!patch) return;
        pendente.current.delete(itemId);
        setSalvar((s) => ({ ...s, [itemId]: "salvando" }));
        let resultado: Awaited<ReturnType<typeof atualizarItemChecklistAction>>;
        try {
          resultado = await atualizarItemChecklistAction(slug, osId, itemId, patch);
        } catch {
          resultado = { ok: false, erro: "Sem conexão." };
        }
        if (resultado.ok) {
          setSalvar((s) => {
            if (pendente.current.has(itemId)) return s; // outra alteração já na fila
            const { [itemId]: _, ...resto } = s;
            return resto;
          });
        } else {
          // devolve a alteração para a fila de pendências (mescla com eventuais novas)
          pendente.current.set(itemId, { ...patch, ...pendente.current.get(itemId) });
          setSalvar((s) => ({ ...s, [itemId]: "erro" }));
          toast.error(`Não salvou o item: ${resultado.erro}`);
        }
      });
      cadeia.current.set(itemId, proxima);
    },
    [slug, osId],
  );

  const atualizar = React.useCallback(
    (itemId: string, patch: PatchItem) => {
      setItens((atual) => atual.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
      pendente.current.set(itemId, { ...pendente.current.get(itemId), ...patch });
      gravar(itemId);
    },
    [gravar],
  );

  const tentarDeNovo = React.useCallback((itemId: string) => gravar(itemId), [gravar]);

  const marcarGrupo = React.useCallback(
    async (grupo: string, status: "na" | "ok") => {
      const anteriores = itens;
      setItens((atual) => atual.map((i) => (i.grupo === grupo ? { ...i, status } : i)));
      const r = await marcarGrupoAction(slug, osId, { grupo, status });
      if (!r.ok) {
        setItens((atual) =>
          atual.map((i) => (i.grupo === grupo ? (anteriores.find((a) => a.id === i.id) ?? i) : i)),
        );
        toast.error(`Não foi possível atualizar o grupo: ${r.erro}`);
      }
    },
    [slug, osId, itens],
  );

  const comErro = Object.values(salvar).filter((s) => s === "erro").length;
  const salvando = Object.values(salvar).filter((s) => s === "salvando").length;

  return { itens, salvar, atualizar, tentarDeNovo, marcarGrupo, comErro, salvando };
}
