import { describe, expect, it } from "vitest";
import { calcularConformidade, formatarFaixa, resumirMedicoes, textoConstatacao } from "./medicao";

describe("conformidade", () => {
  it("avalia dentro e fora da faixa, incluindo limites", () => {
    expect(calcularConformidade(0.1, 0, 0.1)).toBe(true);
    expect(calcularConformidade(0.11, 0, 0.1)).toBe(false);
    expect(calcularConformidade(5, 6, null)).toBe(false);
    expect(calcularConformidade(7, 6, null)).toBe(true);
  });
  it("sem valor ou sem faixa não avalia", () => {
    expect(calcularConformidade(null, 0, 1)).toBeNull();
    expect(calcularConformidade(1, null, null)).toBeNull();
  });
});

describe("faixa e resumo", () => {
  it("formata a faixa", () => {
    expect(formatarFaixa(0.1, 0.2, "mm")).toBe("0,1 a 0,2 mm");
    expect(formatarFaixa(null, 0.1, "mm")).toBe("até 0,1 mm");
    expect(formatarFaixa(null, null)).toBe("");
  });
  it("resume e descreve as constatações", () => {
    const m = [
      { componente: "Cabeçote", conforme: false },
      { componente: "Cabeçote", conforme: false },
      { componente: "Bloco", conforme: true },
    ];
    expect(resumirMedicoes(m).componentesNaoConformes).toEqual(["Cabeçote"]);
    expect(textoConstatacao(m)).toBe("Fora da medida: Cabeçote. Os demais itens medidos (1) estão dentro da medida.");
    expect(textoConstatacao([])).toMatch(/ainda estão sendo feitas/);
    expect(textoConstatacao([{ componente: "Bloco", conforme: true }])).toMatch(/dentro da faixa/);
  });
});
