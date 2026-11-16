import type { OsStatus } from "@/lib/auth/permissoes";

/** Etapas mostradas ao cliente na página pública (prototipo OSPublica). */
export const ETAPAS_PUBLICAS = ["Recebido", "Análise", "Orçamento", "Execução", "Pronto"] as const;

export type EstadoEtapa = "feita" | "atual" | "futura";

/** Índice da etapa atual (5 = tudo concluído). */
export function etapaAtual(status: OsStatus): number {
  switch (status) {
    case "em_recebimento":
    case "recebido":
      return 0;
    case "em_analise":
      return 1;
    case "orcamento_enviado":
    case "reprovado":
      return 2;
    case "aprovado":
    case "em_execucao":
    case "aguardando_peca":
      return 3;
    case "pronto":
      return 4;
    case "entregue":
      return 5;
    case "cancelado":
      return 0;
  }
}

export function estadosEtapas(status: OsStatus): EstadoEtapa[] {
  const atual = etapaAtual(status);
  return ETAPAS_PUBLICAS.map((_, i) => (i < atual ? "feita" : i === atual ? "atual" : "futura"));
}

export function tituloPublico(status: OsStatus, orcamentoStatus: string | null): string {
  if (status === "cancelado") return "OS cancelada";
  if (orcamentoStatus === "enviado") return "Seu orçamento está pronto";
  if (status === "pronto") return "Seu motor está pronto";
  if (status === "entregue") return "OS entregue";
  if (status === "em_execucao" || status === "aguardando_peca" || status === "aprovado")
    return "Seu motor está em serviço";
  return "Acompanhe sua OS";
}
