import type { OsStatus, Papel } from "@/lib/auth/permissoes";
import { podeMoverOs } from "@/lib/auth/permissoes";
import { COLUNAS_QUADRO } from "./status";

export type CartaoOs = {
  id: string;
  numero: string;
  status: OsStatus;
  clienteNome: string;
  clienteTipo: "lojista" | "final";
  motor: string;
  /** Placa do carro do cliente do lojista (ou do veículo do motor). */
  placa: string | null;
  tecnicoId: string | null;
  tecnicoNome: string | null;
  prazo: string | null; // yyyy-mm-dd
  atualizadoEm: string;
  ehGarantia: boolean;
};

export type FiltrosQuadro = {
  tecnico: string; // "todos" | "sem" | id
  tipo: "todos" | "lojista" | "final";
  soAtrasadas: boolean;
  busca: string;
};

export const FILTROS_PADRAO: FiltrosQuadro = {
  tecnico: "todos",
  tipo: "todos",
  soAtrasadas: false,
  busca: "",
};

const MS_DIA = 86_400_000;

/** Data de hoje (yyyy-mm-dd) em America/Sao_Paulo. */
export function hojeSaoPaulo(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / MS_DIA);
}

/** Dias de atraso (>0) de uma OS ainda aberta; 0 se no prazo ou sem prazo. */
export function diasAtraso(prazo: string | null, status: OsStatus, hoje: string): number {
  if (!prazo || status === "entregue" || status === "cancelado" || status === "reprovado") return 0;
  return Math.max(0, diasEntre(hoje, prazo));
}

export function estaAtrasada(c: Pick<CartaoOs, "prazo" | "status">, hoje: string): boolean {
  return diasAtraso(c.prazo, c.status, hoje) > 0;
}

/** "Atrasada 2 dias" / "Prazo 22/11" / "Sem prazo". */
export function rotuloPrazo(c: Pick<CartaoOs, "prazo" | "status">, hoje: string): string {
  if (!c.prazo) return "Sem prazo";
  const atraso = diasAtraso(c.prazo, c.status, hoje);
  if (atraso > 0) return `Atrasada ${atraso} ${atraso === 1 ? "dia" : "dias"}`;
  const [, m, d] = c.prazo.split("-");
  return `Prazo ${d}/${m}`;
}

export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function filtrarCartoes(cartoes: CartaoOs[], f: FiltrosQuadro, hoje: string): CartaoOs[] {
  const termo = semAcento(f.busca.trim());
  return cartoes.filter((c) => {
    if (f.tecnico === "sem" && c.tecnicoId) return false;
    if (f.tecnico !== "todos" && f.tecnico !== "sem" && c.tecnicoId !== f.tecnico) return false;
    if (f.tipo !== "todos" && c.clienteTipo !== f.tipo) return false;
    if (f.soAtrasadas && !estaAtrasada(c, hoje)) return false;
    if (termo) {
      const alvo = semAcento(
        [c.numero, c.clienteNome, c.motor, c.placa ?? "", c.tecnicoNome ?? ""].join(" "),
      );
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });
}

export type ColunaQuadro = { status: OsStatus; cartoes: CartaoOs[] };

/** Agrupa nas colunas do quadro; dentro da coluna, atrasadas primeiro e depois por prazo. */
export function agruparPorColuna(cartoes: CartaoOs[], hoje: string): ColunaQuadro[] {
  return COLUNAS_QUADRO.map((status) => ({
    status,
    cartoes: cartoes
      .filter((c) => c.status === status)
      .sort((a, b) => {
        const aa = estaAtrasada(a, hoje) ? 1 : 0;
        const bb = estaAtrasada(b, hoje) ? 1 : 0;
        if (aa !== bb) return bb - aa;
        const pa = a.prazo ?? "9999-12-31";
        const pb = b.prazo ?? "9999-12-31";
        return pa === pb ? a.numero.localeCompare(b.numero) : pa.localeCompare(pb);
      }),
  }));
}

/** Destinos que o papel pode usar no menu "Mover para…" (só colunas do quadro). */
export function destinosPermitidos(
  papel: Papel,
  c: Pick<CartaoOs, "status">,
  atribuidaAoMembro: boolean,
): OsStatus[] {
  return COLUNAS_QUADRO.filter((s) => podeMoverOs(papel, c.status, s, { atribuidaAoMembro }));
}
