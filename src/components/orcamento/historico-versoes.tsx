import { Badge } from "@/components/ui/badge";
import { formatarDataHora, formatarMoeda } from "@/lib/format";
import { ROTULO_STATUS_ORCAMENTO, type StatusOrcamento } from "@/lib/orcamento/calculos";
import { ROTULO_CANAL } from "@/lib/validacoes/orcamento";

export type VersaoHistorico = {
  id: string;
  versao: number;
  status: StatusOrcamento;
  total: number;
  enviado_em: string | null;
  respondido_em: string | null;
  respondido_por_nome: string | null;
  canal: keyof typeof ROTULO_CANAL | null;
};

const TOM: Record<StatusOrcamento, "neutro" | "roxo" | "sucesso" | "perigo" | "contorno"> = {
  rascunho: "neutro",
  enviado: "roxo",
  aprovado: "sucesso",
  reprovado: "perigo",
  substituido: "contorno",
};

export function HistoricoVersoes({ versoes }: { versoes: VersaoHistorico[] }) {
  return (
    <ol className="divide-y divide-borda rounded-xl border border-borda bg-superficie">
      {versoes.map((v) => (
        <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">
              Versão {v.versao}{" "}
              <Badge variant={TOM[v.status]}>{ROTULO_STATUS_ORCAMENTO[v.status]}</Badge>
            </p>
            <p className="text-sm text-texto-secundario">
              {v.enviado_em ? `Enviada em ${formatarDataHora(v.enviado_em)}` : "Não enviada"}
              {v.respondido_em &&
                ` · respondida em ${formatarDataHora(v.respondido_em)} por ${v.respondido_por_nome ?? "—"}${v.canal ? ` (${ROTULO_CANAL[v.canal]})` : ""}`}
            </p>
          </div>
          <span className="text-[15px] font-semibold tabular-nums">{formatarMoeda(v.total)}</span>
        </li>
      ))}
    </ol>
  );
}
