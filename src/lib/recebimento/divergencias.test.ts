import { describe, expect, it } from "vitest";
import {
  agruparPorGrupo,
  contarDivergencias,
  descreverItem,
  ehDivergencia,
  listarDivergencias,
  type ItemChecklist,
} from "./divergencias";

function item(p: Partial<ItemChecklist> & Pick<ItemChecklist, "id">): ItemChecklist {
  return {
    grupo: "Bloco",
    descricao: `Item ${p.id}`,
    ordem: 0,
    exige_quantidade: false,
    status: "ok",
    quantidade: null,
    observacao: null,
    ...p,
  };
}

describe("divergências do checklist", () => {
  it("só danificado e ausente contam; N/A e OK não", () => {
    expect(ehDivergencia("danificado")).toBe(true);
    expect(ehDivergencia("ausente")).toBe(true);
    expect(ehDivergencia("ok")).toBe(false);
    expect(ehDivergencia("na")).toBe(false);
  });

  it("conta e lista divergências em ordem", () => {
    const itens = [
      item({ id: "a", ordem: 3, status: "ausente" }),
      item({ id: "b", ordem: 1, status: "ok" }),
      item({ id: "c", ordem: 2, status: "danificado" }),
      item({ id: "d", ordem: 4, status: "na" }),
    ];
    expect(contarDivergencias(itens)).toBe(2);
    expect(listarDivergencias(itens).map((i) => i.id)).toEqual(["c", "a"]);
  });

  it("tudo OK não gera divergência", () => {
    expect(listarDivergencias([item({ id: "a" }), item({ id: "b" })])).toEqual([]);
  });

  it("agrupa preservando a ordem e marca grupo todo N/A", () => {
    const itens = [
      item({ id: "1", grupo: "Distribuição", ordem: 20, status: "na" }),
      item({ id: "2", grupo: "Bloco", ordem: 10, status: "danificado" }),
      item({ id: "3", grupo: "Distribuição", ordem: 21, status: "na" }),
      item({ id: "4", grupo: "Bloco", ordem: 11 }),
    ];
    const grupos = agruparPorGrupo(itens);
    expect(grupos.map((g) => g.nome)).toEqual(["Bloco", "Distribuição"]);
    expect(grupos[0]).toMatchObject({ divergencias: 1, todoNa: false });
    expect(grupos[1]).toMatchObject({ divergencias: 0, todoNa: true });
  });

  it("descreve item com quantidade", () => {
    expect(descreverItem({ descricao: "Bielas", exige_quantidade: true, quantidade: 4 })).toBe(
      "Bielas (4)",
    );
    expect(descreverItem({ descricao: "Bielas", exige_quantidade: false, quantidade: 4 })).toBe(
      "Bielas",
    );
    expect(descreverItem({ descricao: "Bielas", exige_quantidade: true, quantidade: null })).toBe(
      "Bielas",
    );
  });
});
