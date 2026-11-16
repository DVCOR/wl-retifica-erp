import { describe, expect, it } from "vitest";
import { itemAtivo, itensCelular, itensDoPapel } from "./nav-itens";

describe("menu por papel", () => {
  it("técnico vê bancada e não vê clientes nem configurações", () => {
    const rotas = itensDoPapel("tecnico").map((i) => i.rota);
    expect(rotas).toContain("bancada");
    expect(rotas).not.toContain("clientes");
    expect(rotas).not.toContain("configuracoes");
    expect(rotas).not.toContain("os");
  });
  it("só o dono vê configurações", () => {
    expect(itensDoPapel("dono").map((i) => i.rota)).toContain("configuracoes");
    expect(itensDoPapel("balcao").map((i) => i.rota)).not.toContain("configuracoes");
    expect(itensDoPapel("financeiro").map((i) => i.rota)).not.toContain("configuracoes");
  });
  it("celular do dono segue o protótipo: Início, OS, Clientes", () => {
    expect(itensCelular("dono").slice(0, 3).map((i) => i.rota)).toEqual(["inicio", "os", "clientes"]);
  });
  it("itemAtivo", () => {
    expect(itemAtivo("/wl/os/123", "wl", "os")).toBe(true);
    expect(itemAtivo("/wl/os", "wl", "os")).toBe(true);
    expect(itemAtivo("/wl/os-x", "wl", "os")).toBe(false);
  });
});
