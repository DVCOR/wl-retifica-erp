import type { OsStatus } from "@/lib/auth/permissoes";

export type TomStatus =
  "neutro" | "info" | "roxo" | "sucesso" | "primaria" | "alerta" | "perigo" | "escuro" | "contorno";

export const STATUS_OS: Record<OsStatus, { rotulo: string; tom: TomStatus; descricao: string }> = {
  em_recebimento: {
    rotulo: "Em recebimento",
    tom: "contorno",
    descricao: "Checklist, fotos e assinatura em andamento",
  },
  recebido: { rotulo: "Recebido", tom: "neutro", descricao: "Motor recebido e conferido" },
  em_analise: { rotulo: "Em análise", tom: "info", descricao: "Desmontagem e medições" },
  orcamento_enviado: {
    rotulo: "Orçamento enviado",
    tom: "roxo",
    descricao: "Aguardando resposta do cliente",
  },
  aprovado: { rotulo: "Aprovado", tom: "sucesso", descricao: "Cliente aprovou o orçamento" },
  reprovado: {
    rotulo: "Reprovado",
    tom: "perigo",
    descricao: "Cliente reprovou; devolver o motor",
  },
  em_execucao: { rotulo: "Em execução", tom: "primaria", descricao: "Serviços na bancada" },
  aguardando_peca: { rotulo: "Aguardando peça", tom: "alerta", descricao: "Parado esperando peça" },
  pronto: { rotulo: "Pronto", tom: "sucesso", descricao: "Pronto para retirada" },
  entregue: {
    rotulo: "Entregue",
    tom: "escuro",
    descricao: "Retirado pelo cliente; garantia correndo",
  },
  cancelado: { rotulo: "Cancelado", tom: "contorno", descricao: "OS cancelada" },
};

/** Ordem das colunas do quadro (kanban). */
export const COLUNAS_QUADRO: readonly OsStatus[] = [
  "recebido",
  "em_analise",
  "orcamento_enviado",
  "aprovado",
  "em_execucao",
  "aguardando_peca",
  "pronto",
] as const;

export const STATUS_FINAIS: readonly OsStatus[] = ["entregue", "cancelado"] as const;
