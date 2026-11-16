import type { UnidadeServico } from "./calculos";

/** Tipos do módulo Catálogo compartilhados entre servidor e cliente. */

export type ServicoLista = {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string | null;
  unidade: UnidadeServico;
  /** null quando o papel não vê preços. */
  preco_base: number | null;
  tempo_padrao_min: number | null;
  ativo: boolean;
};

export type PecaLista = {
  id: string;
  codigo: string | null;
  descricao: string;
  marca: string | null;
  unidade: string;
  custo: number | null;
  preco_venda: number | null;
  ativo: boolean;
};

export type TabelaPrecoLista = {
  id: string;
  nome: string;
  desconto_padrao_pct: number;
  padrao_para: "lojista" | "final" | null;
  ativo: boolean;
  /** Clientes com esta tabela escolhida explicitamente. */
  clientes_explicitos: number;
  /** Clientes sem tabela que a usam por ser a padrão do tipo. */
  clientes_por_padrao: number;
  itens_especificos: number;
};

export type LinhaPrecoTabela = {
  tipo: "servico" | "peca";
  id: string;
  codigo: string | null;
  descricao: string;
  grupo: string | null;
  unidade: string;
  preco_base: number;
  /** null = usa o desconto padrão da tabela. */
  preco_especifico: number | null;
};

export type ItemKit = {
  tipo: "servico" | "peca";
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  /** Preço efetivo unitário na tabela escolhida; null se o papel não vê preço. */
  preco: number | null;
};

export type KitLista = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  itens: ItemKit[];
  total: number | null;
};
