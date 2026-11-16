import { describe, expect, it } from "vitest";
import {
  adicionarUltimaBusca,
  agruparResultados,
  hrefResultado,
  type ResultadoBusca,
} from "./busca";

const r = (tipo: ResultadoBusca["tipo"], id: string): ResultadoBusca => ({
  tipo,
  id,
  titulo: id,
  subtitulo: "",
});

describe("busca", () => {
  it("agrupa na ordem clientes, motores, OS e omite vazios", () => {
    const g = agruparResultados([r("os", "1"), r("cliente", "2"), r("os", "3")]);
    expect(g.map((x) => x.tipo)).toEqual(["cliente", "os"]);
    expect(g[1].itens.map((i) => i.id)).toEqual(["1", "3"]);
  });
  it("respeita tipos permitidos", () => {
    expect(agruparResultados([r("cliente", "1")], ["os"])).toEqual([]);
  });
  it("monta links", () => {
    expect(hrefResultado("wl", r("motor", "9"))).toBe("/wl/motores/9");
    expect(hrefResultado("wl", r("cliente", "9"))).toBe("/wl/clientes/9");
    expect(hrefResultado("wl", r("os", "9"))).toBe("/wl/os/9");
  });
  it("últimas buscas: topo, sem duplicar, máx. 5, ignora curtas", () => {
    expect(adicionarUltimaBusca(["a1", "b2"], "B2")).toEqual(["B2", "a1"]);
    expect(adicionarUltimaBusca(["x"], "a")).toEqual(["x"]);
    expect(adicionarUltimaBusca(["1a", "2a", "3a", "4a", "5a"], "novo")).toHaveLength(5);
  });
});
