import type { Database } from "@/lib/supabase/types";

/**
 * Matriz de permissões (SPEC item 3). Espelha o que o banco aplica via RLS e
 * funções — a interface usa isto só para mostrar/esconder ações; a segurança
 * real está no banco (supabase/migrations/*_rls.sql).
 */
export type Papel = Database["public"]["Enums"]["papel"];
export type OsStatus = Database["public"]["Enums"]["os_status"];

export const PAPEIS: readonly Papel[] = ["dono", "balcao", "tecnico", "financeiro"] as const;

export const ROTULO_PAPEL: Record<Papel, string> = {
  dono: "Dono",
  balcao: "Balcão",
  tecnico: "Técnico",
  financeiro: "Financeiro",
};

const MATRIZ = {
  // clientes
  "clientes.ver": ["dono", "balcao", "financeiro"],
  "clientes.cadastrar": ["dono", "balcao"],
  "clientes.editar": ["dono", "balcao"],
  "clientes.editar_financeiro": ["dono", "balcao", "financeiro"],
  "clientes.excluir": ["dono"],
  // motores
  "motores.ver": ["dono", "balcao", "tecnico"],
  "motores.editar": ["dono", "balcao"],
  // OS
  "os.ver_quadro": ["dono", "balcao", "financeiro"],
  "os.abrir": ["dono", "balcao"],
  "os.checklist": ["dono", "balcao"],
  "os.editar": ["dono", "balcao"],
  "os.mudar_status": ["dono", "balcao", "tecnico"], // técnico: só OS atribuídas (ver podeMoverOs)
  "os.entregar": ["dono", "balcao", "financeiro"],
  "os.cancelar": ["dono"],
  "os.anexar_fotos": ["dono", "balcao", "tecnico"],
  // laudo e execução
  "laudo.registrar": ["dono", "tecnico"],
  "apontamento.registrar": ["dono", "tecnico"],
  "bancada.acessar": ["dono", "tecnico"],
  // orçamento
  "orcamento.montar": ["dono", "balcao"],
  "orcamento.enviar": ["dono", "balcao"],
  "orcamento.registrar_resposta": ["dono", "balcao"],
  "orcamento.sugerir_itens": ["dono", "balcao", "tecnico"],
  "orcamento.aprovar_desconto": ["dono"],
  // catálogo
  "catalogo.ver": ["dono", "balcao", "tecnico", "financeiro"],
  "catalogo.editar": ["dono"],
  // financeiro (Fase 2)
  "financeiro.acessar": ["dono", "financeiro"],
  "financeiro.receber_balcao": ["dono", "balcao", "financeiro"],
  // relatórios
  "dashboard.completo": ["dono"],
  "relatorios.operacionais": ["dono", "balcao"],
  "relatorios.financeiros": ["dono", "financeiro"],
  // administração
  "configuracoes.gerenciar": ["dono"],
  "usuarios.gerenciar": ["dono"],
} as const satisfies Record<string, readonly Papel[]>;

export type Acao = keyof typeof MATRIZ;

export const ACOES = Object.keys(MATRIZ) as Acao[];

/** O papel pode executar a ação? */
export function pode(papel: Papel | null | undefined, acao: Acao): boolean {
  if (!papel) return false;
  return (MATRIZ[acao] as readonly Papel[]).includes(papel);
}

export type ConfigEmpresa = {
  tecnico_ve_precos?: boolean;
  validade_orcamento_dias?: number;
  garantia_dias_padrao?: number;
  cobrar_taxa_analise?: boolean;
  taxa_analise_valor?: number;
  termos_recebimento?: string;
  termos_garantia?: string;
};

/** Pode ver preços? Todos menos o técnico, salvo config.tecnico_ve_precos (igual a pode_ver_precos() no banco). */
export function podeVerPrecos(
  papel: Papel | null | undefined,
  config: ConfigEmpresa | null | undefined,
): boolean {
  if (!papel) return false;
  return papel !== "tecnico" || config?.tecnico_ve_precos === true;
}

// ---------------------------------------------------------------------------
// Transições de status (espelham os_transicao_permitida/os_papeis_para_status)
// ---------------------------------------------------------------------------
export const TRANSICOES_OS: Record<OsStatus, readonly OsStatus[]> = {
  em_recebimento: ["recebido", "cancelado"],
  recebido: ["em_analise", "orcamento_enviado", "cancelado"],
  em_analise: ["orcamento_enviado", "cancelado"],
  orcamento_enviado: ["aprovado", "reprovado", "em_analise", "orcamento_enviado", "cancelado"],
  aprovado: ["em_execucao", "orcamento_enviado", "cancelado"],
  reprovado: ["orcamento_enviado", "entregue", "cancelado"],
  em_execucao: ["aguardando_peca", "pronto", "orcamento_enviado", "cancelado"],
  aguardando_peca: ["em_execucao", "cancelado"],
  pronto: ["entregue", "em_execucao"],
  entregue: [],
  cancelado: [],
};

export const PAPEIS_POR_STATUS: Record<OsStatus, readonly Papel[]> = {
  em_recebimento: [],
  recebido: ["dono", "balcao"],
  em_analise: ["dono", "balcao", "tecnico"],
  orcamento_enviado: ["dono", "balcao"],
  aprovado: ["dono", "balcao"],
  reprovado: ["dono", "balcao"],
  em_execucao: ["dono", "balcao", "tecnico"],
  aguardando_peca: ["dono", "balcao", "tecnico"],
  pronto: ["dono", "balcao", "tecnico"],
  entregue: ["dono", "balcao", "financeiro"],
  cancelado: ["dono"],
};

/**
 * O papel pode mover a OS de `de` para `para`? (as pré-condições de cada
 * status — fotos, assinatura, orçamento — são checadas pelo banco em
 * alterar_status_os()).
 */
export function podeMoverOs(
  papel: Papel | null | undefined,
  de: OsStatus,
  para: OsStatus,
  opcoes: { atribuidaAoMembro?: boolean } = {},
): boolean {
  if (!papel || de === para) return false;
  if (!TRANSICOES_OS[de].includes(para)) return false;
  if (!PAPEIS_POR_STATUS[para].includes(papel)) return false;
  if (papel === "tecnico" && !opcoes.atribuidaAoMembro) return false;
  return true;
}
