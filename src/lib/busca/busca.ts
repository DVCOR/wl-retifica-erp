export type TipoResultado = "cliente" | "motor" | "os";

export type ResultadoBusca = {
  tipo: TipoResultado;
  id: string;
  titulo: string;
  subtitulo: string;
};

export const ROTULO_GRUPO: Record<TipoResultado, string> = {
  cliente: "Clientes",
  motor: "Motores e placas",
  os: "Ordens de serviço",
};

const ORDEM: readonly TipoResultado[] = ["cliente", "motor", "os"];

export function hrefResultado(slug: string, r: Pick<ResultadoBusca, "tipo" | "id">): string {
  const rota = r.tipo === "cliente" ? "clientes" : r.tipo === "motor" ? "motores" : "os";
  return `/${slug}/${rota}/${r.id}`;
}

/** Agrupa mantendo a ordem de relevância dentro de cada grupo; omite grupos vazios. */
export function agruparResultados(
  rs: readonly ResultadoBusca[],
  tiposPermitidos: readonly TipoResultado[] = ORDEM,
): { tipo: TipoResultado; rotulo: string; itens: ResultadoBusca[] }[] {
  return ORDEM.filter((t) => tiposPermitidos.includes(t))
    .map((tipo) => ({ tipo, rotulo: ROTULO_GRUPO[tipo], itens: rs.filter((r) => r.tipo === tipo) }))
    .filter((g) => g.itens.length > 0);
}

export const MAX_ULTIMAS = 5;

/** Insere a busca no topo, sem duplicar (ignora caixa) e limitando o tamanho. */
export function adicionarUltimaBusca(lista: readonly string[], termo: string): string[] {
  const t = termo.trim();
  if (t.length < 2) return [...lista];
  const resto = lista.filter((x) => x.toLowerCase() !== t.toLowerCase());
  return [t, ...resto].slice(0, MAX_ULTIMAS);
}

export function lerUltimasBuscas(chave: string): string[] {
  try {
    const bruto = window.localStorage.getItem(chave);
    const v: unknown = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_ULTIMAS)
      : [];
  } catch {
    return [];
  }
}

export function gravarUltimasBuscas(chave: string, lista: readonly string[]): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(lista));
  } catch {
    // armazenamento indisponível (modo privado/cota): segue sem histórico
  }
}
