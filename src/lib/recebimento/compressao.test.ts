import { describe, expect, it } from "vitest";
import { calcularDimensoes } from "./compressao";

describe("calcularDimensoes", () => {
  it("reduz paisagem mantendo proporção (lado maior = 1600)", () => {
    expect(calcularDimensoes(4000, 3000)).toEqual({ largura: 1600, altura: 1200 });
  });
  it("reduz retrato", () => {
    expect(calcularDimensoes(3000, 4000)).toEqual({ largura: 1200, altura: 1600 });
  });
  it("não amplia imagens pequenas", () => {
    expect(calcularDimensoes(800, 600)).toEqual({ largura: 800, altura: 600 });
    expect(calcularDimensoes(1600, 1600)).toEqual({ largura: 1600, altura: 1600 });
  });
  it("respeita limite customizado e nunca zera um lado", () => {
    expect(calcularDimensoes(1000, 500, 100)).toEqual({ largura: 100, altura: 50 });
    expect(calcularDimensoes(10000, 1, 100)).toEqual({ largura: 100, altura: 1 });
  });
  it("entrada inválida devolve 0x0", () => {
    expect(calcularDimensoes(0, 100)).toEqual({ largura: 0, altura: 0 });
    expect(calcularDimensoes(Number.NaN, 100)).toEqual({ largura: 0, altura: 0 });
  });
});
