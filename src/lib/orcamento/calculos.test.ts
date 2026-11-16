import { describe, expect, it } from "vitest";
import {
  avaliarDesconto,
  calcularTotais,
  estaVencido,
  podeCriarNovaVersao,
  proximaVersao,
  totalItem,
  validadePadrao,
} from "./calculos";

describe("totais do orçamento", () => {
  it("calcula total do item com desconto e limita ao bruto", () => {
    expect(totalItem({ quantidade: 4, precoUnitario: 25.5, desconto: 2 })).toBe(100);
    expect(totalItem({ quantidade: 1, precoUnitario: 10, desconto: 50 })).toBe(0);
  });

  it("soma itens e aplica desconto no total", () => {
    const t = calcularTotais(
      [
        { quantidade: 1, precoUnitario: 200, desconto: 20 },
        { quantidade: 16, precoUnitario: 10, desconto: 0 },
      ],
      30,
    );
    expect(t.bruto).toBe(360);
    expect(t.subtotal).toBe(340);
    expect(t.total).toBe(310);
    expect(t.descontoPct).toBe(13.89);
  });

  it("total nunca fica negativo e orçamento vazio é zero", () => {
    expect(calcularTotais([], 10).total).toBe(0);
    expect(calcularTotais([{ quantidade: 1, precoUnitario: 50, desconto: 0 }], 80).total).toBe(0);
  });
});

describe("limite de desconto", () => {
  const totais = { descontoPct: 12 };
  it("bloqueia balcão acima do limite", () => {
    const r = avaliarDesconto({ totais, limitePct: 10, papel: "balcao" });
    expect(r.bloqueado).toBe(true);
    expect(r.mensagem).toMatch(/aprovação do dono/);
  });
  it("dono passa e aprovação do dono libera", () => {
    expect(avaliarDesconto({ totais, limitePct: 0, papel: "dono" }).bloqueado).toBe(false);
    expect(
      avaliarDesconto({ totais, limitePct: 10, papel: "balcao", aprovadoPeloDono: true }).bloqueado,
    ).toBe(false);
  });
  it("dentro do limite não bloqueia; limite nulo vale zero", () => {
    expect(avaliarDesconto({ totais, limitePct: 12, papel: "balcao" }).excede).toBe(false);
    expect(avaliarDesconto({ totais, limitePct: null, papel: "balcao" }).bloqueado).toBe(true);
  });
});

describe("versões e validade", () => {
  it("próxima versão", () => {
    expect(proximaVersao([])).toBe(1);
    expect(proximaVersao([{ versao: 1 }, { versao: 3 }])).toBe(4);
  });
  it("nova versão só após o rascunho", () => {
    expect(podeCriarNovaVersao("rascunho")).toBe(false);
    expect(podeCriarNovaVersao("enviado")).toBe(true);
    expect(podeCriarNovaVersao("reprovado")).toBe(true);
    expect(podeCriarNovaVersao(null)).toBe(false);
  });
  it("validade padrão de 7 dias no fuso de São Paulo", () => {
    expect(validadePadrao(7, new Date("2026-11-15T12:00:00Z"))).toBe("2026-11-22");
    // 01:00 UTC ainda é o dia anterior em São Paulo
    expect(validadePadrao(7, new Date("2026-11-16T01:00:00Z"))).toBe("2026-11-22");
  });
  it("detecta vencimento", () => {
    expect(estaVencido("2026-11-14", "2026-11-15")).toBe(true);
    expect(estaVencido("2026-11-15", "2026-11-15")).toBe(false);
    expect(estaVencido(null, "2026-11-15")).toBe(false);
  });
});
