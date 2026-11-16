import { describe, expect, it } from "vitest";
import {
  aprovadosNoMes,
  contarPorStatus,
  entreguesNoMes,
  inicioDaSemana,
  orcamentosParados,
  osAtrasadas,
  percentualLojista,
  rankingLojistas,
  serieSemanal,
  ticketMedio,
  type AprovadoLinha,
  type OsLinha,
} from "./agregacoes";

const os = (p: Partial<OsLinha>): OsLinha => ({
  id: "o" + Math.random(),
  numero: "2026-000001",
  status: "recebido",
  clienteId: "c1",
  clienteNome: "Cliente",
  clienteTipo: "final",
  tecnicoId: null,
  prazo: null,
  criadoEm: "2026-11-10T15:00:00Z",
  entregueEm: null,
  ...p,
});
const ap = (p: Partial<AprovadoLinha>): AprovadoLinha => ({
  osId: "o1",
  total: 100,
  respondidoEm: "2026-11-05T15:00:00Z",
  clienteId: "c1",
  clienteNome: "Loja",
  clienteTipo: "lojista",
  ...p,
});
const HOJE = "2026-11-16"; // segunda

describe("agregações do início", () => {
  it("conta só OS abertas por status", () => {
    const r = contarPorStatus([
      os({}),
      os({}),
      os({ status: "pronto" }),
      os({ status: "entregue" }),
    ]);
    expect(r).toEqual({ recebido: 2, pronto: 1 });
  });
  it("atrasadas: prazo vencido, aberta, não pronta; hoje não conta", () => {
    const l = osAtrasadas(
      [
        os({ prazo: "2026-11-15" }),
        os({ prazo: HOJE }),
        os({ prazo: "2026-11-01", status: "entregue" }),
        os({ prazo: "2026-11-01", status: "pronto" }),
        os({ prazo: "2026-10-01" }),
      ],
      HOJE,
    );
    expect(l.map((o) => o.prazo)).toEqual(["2026-10-01", "2026-11-15"]);
  });
  it("entregues e aprovados do mês usam fuso de São Paulo", () => {
    // 01/12 01:00 UTC ainda é 30/11 em SP
    expect(
      entreguesNoMes(
        [
          os({ status: "entregue", entregueEm: "2026-12-01T01:00:00Z" }),
          os({ status: "entregue", entregueEm: "2026-11-02T12:00:00Z" }),
        ],
        HOJE,
      ),
    ).toHaveLength(2);
    expect(
      aprovadosNoMes([ap({}), ap({ respondidoEm: "2026-10-31T12:00:00Z" })], HOJE),
    ).toHaveLength(1);
  });
  it("ticket médio", () => {
    expect(ticketMedio([])).toBeNull();
    expect(ticketMedio([ap({ total: 100 }), ap({ total: 201 })])).toBe(150.5);
  });
  it("percentual lojista x final", () => {
    expect(percentualLojista([])).toBeNull();
    expect(percentualLojista([os({ clienteTipo: "lojista" }), os({}), os({})])).toEqual({
      lojista: 33,
      final: 67,
    });
  });
  it("início da semana é segunda", () => {
    expect(inicioDaSemana("2026-11-16")).toBe("2026-11-16");
    expect(inicioDaSemana("2026-11-22")).toBe("2026-11-16");
  });
  it("série semanal tem 8 semanas e conta abertas e entregues", () => {
    const s = serieSemanal(
      [
        os({ criadoEm: "2026-11-17T12:00:00Z" }),
        os({ criadoEm: "2026-09-01T12:00:00Z" }),
        os({
          status: "entregue",
          criadoEm: "2026-11-02T12:00:00Z",
          entregueEm: "2026-11-10T12:00:00Z",
        }),
        os({ status: "cancelado" }),
      ],
      HOJE,
    );
    expect(s).toHaveLength(8);
    expect(s[7]).toMatchObject({ inicio: "2026-11-16", abertas: 1, entregues: 0 });
    expect(s[6]).toMatchObject({ inicio: "2026-11-09", abertas: 0, entregues: 1 });
    expect(s[0].inicio).toBe("2026-09-28");
  });
  it("ranking só de lojistas, ordenado por valor, top N", () => {
    const r = rankingLojistas(
      [
        ap({ clienteId: "a", clienteNome: "A", total: 100 }),
        ap({ clienteId: "b", clienteNome: "B", total: 500 }),
        ap({ clienteId: "a", clienteNome: "A", total: 450 }),
        ap({ clienteId: "f", clienteTipo: "final", total: 9999 }),
      ],
      2,
    );
    expect(r.map((x) => [x.clienteId, x.valor, x.qtd])).toEqual([
      ["a", 550, 2],
      ["b", 500, 1],
    ]);
  });
  it("orçamentos parados há mais de X dias", () => {
    const a = os({ status: "orcamento_enviado" });
    const b = os({ status: "orcamento_enviado" });
    const m = new Map([
      [a.id, "2026-11-10T12:00:00Z"],
      [b.id, "2026-11-14T12:00:00Z"],
    ]);
    const r = orcamentosParados([a, b], m, HOJE, 3);
    expect(r.map((x) => [x.id, x.diasParado])).toEqual([[a.id, 6]]);
  });
});
