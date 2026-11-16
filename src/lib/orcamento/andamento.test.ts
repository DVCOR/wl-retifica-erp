import { describe, expect, it } from "vitest";
import { estadosEtapas, tituloPublico } from "./andamento";

describe("andamento público", () => {
  it("marca etapas feitas, atual e futuras", () => {
    expect(estadosEtapas("orcamento_enviado")).toEqual(["feita", "feita", "atual", "futura", "futura"]);
    expect(estadosEtapas("entregue")).toEqual(["feita", "feita", "feita", "feita", "feita"]);
    expect(estadosEtapas("aguardando_peca")[3]).toBe("atual");
  });
  it("título conforme o estado", () => {
    expect(tituloPublico("orcamento_enviado", "enviado")).toBe("Seu orçamento está pronto");
    expect(tituloPublico("em_analise", null)).toBe("Acompanhe sua OS");
  });
});
