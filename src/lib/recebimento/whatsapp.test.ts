import { describe, expect, it } from "vitest";
import { linkWhatsapp, montarMensagemRecebimento, normalizarTelefoneWhatsapp } from "./whatsapp";

describe("whatsapp", () => {
  it("normaliza telefone brasileiro", () => {
    expect(normalizarTelefoneWhatsapp("(11) 99999-0000")).toBe("5511999990000");
    expect(normalizarTelefoneWhatsapp("1133334444")).toBe("551133334444");
    expect(normalizarTelefoneWhatsapp("+55 11 99999-0000")).toBe("5511999990000");
    expect(normalizarTelefoneWhatsapp("123")).toBeNull();
    expect(normalizarTelefoneWhatsapp(null)).toBeNull();
  });

  it("monta mensagem com divergências no singular e plural", () => {
    const base = {
      nomeCliente: "Oficina A",
      numeroOs: "2026-000152",
      empresa: "WL",
      linkOs: "https://x/y",
    };
    expect(montarMensagemRecebimento({ ...base, qtdDivergencias: 0 })).toContain(
      "sem divergências",
    );
    expect(montarMensagemRecebimento({ ...base, qtdDivergencias: 1 })).toContain(
      "1 divergência na",
    );
    const m = montarMensagemRecebimento({ ...base, qtdDivergencias: 3 });
    expect(m).toContain("3 divergências");
    expect(m).toContain("2026-000152");
    expect(m).toContain("https://x/y");
  });

  it("gera link wa.me com texto codificado, com ou sem telefone", () => {
    expect(linkWhatsapp("11999990000", "Olá & tudo")).toBe(
      "https://wa.me/5511999990000?text=Ol%C3%A1%20%26%20tudo",
    );
    expect(linkWhatsapp(null, "oi")).toBe("https://wa.me/?text=oi");
  });
});
