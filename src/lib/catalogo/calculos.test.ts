import { describe, expect, it } from "vitest";
import { arredondar, descontoEfetivoPct, precoEfetivo, totalKit } from "./calculos";
import { textoDeValor, valorDeTexto } from "./moeda";

describe("precoEfetivo", () => {
  it("aplica o desconto da tabela sobre o preço base", () => {
    expect(precoEfetivo({ precoBase: 180, descontoPct: 15 })).toBe(153);
  });
  it("sem desconto devolve o base", () => {
    expect(precoEfetivo({ precoBase: 99.9 })).toBe(99.9);
    expect(precoEfetivo({ precoBase: 99.9, descontoPct: 0 })).toBe(99.9);
  });
  it("preço específico vence o desconto", () => {
    expect(precoEfetivo({ precoBase: 180, descontoPct: 15, precoEspecifico: 120 })).toBe(120);
  });
  it("preço específico zero é válido (cortesia)", () => {
    expect(precoEfetivo({ precoBase: 180, descontoPct: 15, precoEspecifico: 0 })).toBe(0);
  });
  it("arredonda em centavos", () => {
    expect(precoEfetivo({ precoBase: 33.33, descontoPct: 10 })).toBe(30);
    expect(precoEfetivo({ precoBase: 10.05, descontoPct: 33.33 })).toBe(6.7);
  });
  it("limita desconto entre 0 e 100", () => {
    expect(precoEfetivo({ precoBase: 100, descontoPct: 150 })).toBe(0);
    expect(precoEfetivo({ precoBase: 100, descontoPct: -5 })).toBe(100);
  });
});

describe("totalKit", () => {
  it("soma quantidade × preço", () => {
    expect(
      totalKit([
        { quantidade: 4, preco: 25.5 },
        { quantidade: 1, preco: 180 },
        { quantidade: 0.5, preco: 10 },
      ]),
    ).toBe(287);
  });
  it("ignora itens sem preço e kit vazio dá zero", () => {
    expect(totalKit([{ quantidade: 2, preco: null }])).toBe(0);
    expect(totalKit([])).toBe(0);
  });
});

describe("descontoEfetivoPct", () => {
  it("calcula o percentual", () => {
    expect(descontoEfetivoPct(200, 170)).toBe(15);
    expect(descontoEfetivoPct(0, 10)).toBe(0);
  });
});

describe("arredondar", () => {
  it("evita erro de ponto flutuante", () => {
    expect(arredondar(1.005)).toBe(1.01);
  });
});

describe("máscara de moeda", () => {
  it("digitar 1250 vira 12,50", () => {
    expect(valorDeTexto("1250")).toBe(12.5);
    expect(textoDeValor(12.5)).toBe("12,50");
  });
  it("ignora tudo que não é dígito", () => {
    expect(valorDeTexto("R$ 1.250,00")).toBe(1250);
  });
  it("vazio ou zero limpa o campo", () => {
    expect(valorDeTexto("")).toBeNull();
    expect(valorDeTexto("0,00")).toBeNull();
  });
  it("formata milhares", () => {
    expect(textoDeValor(1234567.8)).toBe("1.234.567,80");
    expect(textoDeValor(null)).toBe("");
  });
});
