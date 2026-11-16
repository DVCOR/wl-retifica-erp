import { describe, expect, it } from "vitest";
import {
  agruparPorColuna,
  destinosPermitidos,
  diasAtraso,
  filtrarCartoes,
  FILTROS_PADRAO,
  rotuloPrazo,
  type CartaoOs,
} from "./quadro";

const base: CartaoOs = {
  id: "1",
  numero: "2026-000001",
  status: "recebido",
  clienteNome: "Oficina Ágil",
  clienteTipo: "lojista",
  motor: "VW AP 1.8",
  placa: "ABC1D23",
  tecnicoId: "t1",
  tecnicoNome: "João",
  prazo: "2026-11-15",
  atualizadoEm: "2026-11-10T00:00:00Z",
  ehGarantia: false,
};
const hoje = "2026-11-17";

describe("atraso", () => {
  it("conta dias e ignora OS encerradas", () => {
    expect(diasAtraso("2026-11-15", "em_execucao", hoje)).toBe(2);
    expect(diasAtraso("2026-11-17", "em_execucao", hoje)).toBe(0);
    expect(diasAtraso("2026-11-01", "entregue", hoje)).toBe(0);
    expect(diasAtraso(null, "recebido", hoje)).toBe(0);
  });
  it("rotula o prazo", () => {
    expect(rotuloPrazo(base, hoje)).toBe("Atrasada 2 dias");
    expect(rotuloPrazo({ ...base, prazo: "2026-11-16" }, hoje)).toBe("Atrasada 1 dia");
    expect(rotuloPrazo({ ...base, prazo: "2026-11-22" }, hoje)).toBe("Prazo 22/11");
    expect(rotuloPrazo({ ...base, prazo: null }, hoje)).toBe("Sem prazo");
  });
});

describe("filtros e colunas", () => {
  const lista: CartaoOs[] = [
    base,
    { ...base, id: "2", numero: "2026-000002", clienteTipo: "final", tecnicoId: null, tecnicoNome: null, prazo: "2026-11-30", clienteNome: "José" },
    { ...base, id: "3", numero: "2026-000003", status: "em_execucao", prazo: "2026-11-20" },
  ];
  it("filtra por tipo, técnico, atraso e busca sem acento", () => {
    expect(filtrarCartoes(lista, { ...FILTROS_PADRAO, tipo: "final" }, hoje)).toHaveLength(1);
    expect(filtrarCartoes(lista, { ...FILTROS_PADRAO, tecnico: "sem" }, hoje)).toHaveLength(1);
    expect(filtrarCartoes(lista, { ...FILTROS_PADRAO, soAtrasadas: true }, hoje)).toHaveLength(1);
    expect(filtrarCartoes(lista, { ...FILTROS_PADRAO, busca: "agil" }, hoje)).toHaveLength(2);
    expect(filtrarCartoes(lista, { ...FILTROS_PADRAO, busca: "abc1d23" }, hoje)).toHaveLength(3);
  });
  it("agrupa nas 7 colunas com atrasadas primeiro", () => {
    const cols = agruparPorColuna(lista, hoje);
    expect(cols).toHaveLength(7);
    expect(cols[0].cartoes.map((c) => c.id)).toEqual(["1", "2"]);
    expect(cols[4].cartoes.map((c) => c.id)).toEqual(["3"]);
  });
});

describe("destinos", () => {
  it("respeita transições e papel", () => {
    expect(destinosPermitidos("balcao", { status: "recebido" }, false)).toEqual([
      "em_analise",
      "orcamento_enviado",
    ]);
    expect(destinosPermitidos("tecnico", { status: "aprovado" }, true)).toEqual(["em_execucao"]);
    expect(destinosPermitidos("tecnico", { status: "aprovado" }, false)).toEqual([]);
    expect(destinosPermitidos("financeiro", { status: "pronto" }, false)).toEqual([]);
  });
});
