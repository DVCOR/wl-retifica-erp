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
  it("sem link (modo local): sem endereço do sistema e pede resposta pelo WhatsApp", () => {
    const base = {
      nomeCliente: "Carlos",
      numeroOs: "2026-000145",
      empresa: "WL Retífica",
      total: 100,
      validade: null,
    };
    for (const link of [undefined, null, ""]) {
      const t = montarMensagemOrcamento({ ...base, link });
      expect(t).not.toMatch(/https?:\/\//);
      expect(t).toContain("orçamento em PDF");
    }
  });
  it("monta o link público sem barra duplicada", () => {
    expect(linkPublicoOs("https://x.com/", "t")).toBe("https://x.com/os-publica/t");
  });
});
