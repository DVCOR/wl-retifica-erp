import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  agruparPorGrupo,
  descreverItem,
  listarDivergencias,
  ROTULO_STATUS,
  type ItemChecklist,
} from "@/lib/recebimento/divergencias";

/** Mostra só o que difere de OK (SPEC 6: resumo das divergências para o cliente). */
export function ResumoDivergencias({ itens }: { itens: ItemChecklist[] }) {
  const divergencias = listarDivergencias(itens);
  const gruposNa = agruparPorGrupo(itens)
    .filter((g) => g.todoNa)
    .map((g) => g.nome);

  return (
    <div className="flex flex-col gap-3">
      {divergencias.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-sucesso-suave px-4 py-3 text-[15px] font-semibold text-sucesso">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          Nenhuma divergência: todos os itens conferidos estão OK.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-borda overflow-hidden rounded-xl border border-borda">
          {divergencias.map((i) => (
            <li
              key={i.id}
              className="flex items-start justify-between gap-3 bg-superficie px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] text-texto-secundario">{i.grupo}</p>
                <p className="text-base font-semibold text-texto">{descreverItem(i)}</p>
                {i.observacao && (
                  <p className="mt-0.5 text-sm text-texto-secundario">{i.observacao}</p>
                )}
              </div>
              <Badge
                variant={i.status === "danificado" ? "perigo" : "alerta"}
                className="mt-1 text-sm"
              >
                {ROTULO_STATUS[i.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {gruposNa.length > 0 && (
        <p className="text-sm text-texto-secundario">
          Não veio com: <strong className="text-texto">{gruposNa.join(", ")}</strong> (marcado como
          N/A).
        </p>
      )}
    </div>
  );
}
