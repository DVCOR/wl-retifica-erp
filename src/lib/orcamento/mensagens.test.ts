import { describe, expect, it } from "vitest";
import { linkPublicoOs, montarMensagemOrcamento } from "./mensagens";

describe("mensagem do orçamento", () => {
  it("monta texto com total, validade e link", () => {
    const t = montarMensagemOrcamento({
      nomeCliente: "Carlos",
      numeroOs: "2026-000145",
      empresa: "WL Retífica",
      total: 1234.5,
      validade: "2026-11-22",
      link: "https://x.com/os-publica/abc",
    });
    expect(t).toContain("Olá, Carlos!");
    expect(t).toContain("Válido até 22/11/2026.");
    expect(t).toContain("https://x.com/os-publica/abc");
    expect(t).toMatch(/Total: R\$\s?1\.234,50/);
  });
  it("monta o link público sem barra duplicada", () => {
    expect(linkPublicoOs("https://x.com/", "t")).toBe("https://x.com/os-publica/t");
  });
});
