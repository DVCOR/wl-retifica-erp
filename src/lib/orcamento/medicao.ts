/** Regras puras das medições do laudo (espelham tg_medicoes_antes). */

export type Conformidade = boolean | null;

/** Conforme quando há valor e ao menos um limite; null se não dá para avaliar. */
export function calcularConformidade(
  valor: number | null | undefined,
  minimo: number | null | undefined,
  maximo: number | null | undefined,
): Conformidade {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return null;
  const temMin = minimo !== null && minimo !== undefined;
  const temMax = maximo !== null && maximo !== undefined;
  if (!temMin && !temMax) return null;
  return (!temMin || valor >= minimo) && (!temMax || valor <= maximo);
}

const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });

export function formatarNumero(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : NUM.format(n);
}

/** "0,10 a 0,20 mm", "até 0,10 mm", "a partir de 5 mm" ou "" sem faixa. */
export function formatarFaixa(
  minimo: number | null | undefined,
  maximo: number | null | undefined,
  unidade?: string | null,
): string {
  const u = unidade ? ` ${unidade}` : "";
  const temMin = minimo !== null && minimo !== undefined;
  const temMax = maximo !== null && maximo !== undefined;
  if (temMin && temMax) return `${formatarNumero(minimo)} a ${formatarNumero(maximo)}${u}`;
  if (temMax) return `até ${formatarNumero(maximo)}${u}`;
  if (temMin) return `a partir de ${formatarNumero(minimo)}${u}`;
  return "";
}

export type MedicaoResumivel = {
  componente: string;
  conforme: boolean | null;
};

export function resumirMedicoes(medicoes: readonly MedicaoResumivel[]) {
  const naoConformes = medicoes.filter((m) => m.conforme === false);
  return {
    total: medicoes.length,
    conformes: medicoes.filter((m) => m.conforme === true).length,
    naoConformes: naoConformes.length,
    semAvaliacao: medicoes.filter((m) => m.conforme === null).length,
    componentesNaoConformes: [...new Set(naoConformes.map((m) => m.componente))],
  };
}

/** Texto curto "o que encontramos" da página pública. */
export function textoConstatacao(medicoes: readonly MedicaoResumivel[]): string {
  const r = resumirMedicoes(medicoes);
  if (r.total === 0) return "As medições ainda estão sendo feitas pela nossa bancada.";
  if (r.naoConformes === 0) return "Todas as medições ficaram dentro da faixa especificada.";
  const lista = r.componentesNaoConformes.join(", ");
  const resto =
    r.conformes > 0
      ? ` Os demais itens medidos (${r.conformes}) estão dentro da medida.`
      : "";
  return `Fora da medida: ${lista}.${resto}`;
}

/** Sugestões de componentes para agilizar o cadastro (sem inventar tolerâncias). */
export const MODELOS_MEDICAO: readonly {
  componente: string;
  descricao: string;
  unidade: string;
  tipo: "numerica" | "teste";
}[] = [
  { componente: "Cabeçote", descricao: "Empenamento da face", unidade: "mm", tipo: "numerica" },
  { componente: "Cabeçote", descricao: "Folga da guia de válvula", unidade: "mm", tipo: "numerica" },
  { componente: "Cabeçote", descricao: "Teste de trinca/estanqueidade", unidade: "", tipo: "teste" },
  { componente: "Bloco", descricao: "Ovalização do cilindro", unidade: "mm", tipo: "numerica" },
  { componente: "Bloco", descricao: "Conicidade do cilindro", unidade: "mm", tipo: "numerica" },
  { componente: "Virabrequim", descricao: "Diâmetro do colo", unidade: "mm", tipo: "numerica" },
];
