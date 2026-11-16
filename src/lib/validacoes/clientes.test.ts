import { describe, expect, it } from "vitest";
import {
  clienteRapidoSchema,
  clienteSchema,
  filtroClientesSchema,
  linkWhatsapp,
  mascararCnpj,
  mascararCpf,
  mascararTelefone,
  parseDecimalBR,
  validarCnpj,
  validarCpf,
  validarTelefone,
} from "./clientes";

describe("CPF", () => {
  it("aceita CPF válido com ou sem máscara", () => {
    expect(validarCpf("529.982.247-25")).toBe(true);
    expect(validarCpf("52998224725")).toBe(true);
  });
  it("rejeita dígito verificador errado, tamanho errado e repetidos", () => {
    expect(validarCpf("529.982.247-24")).toBe(false);
    expect(validarCpf("1234")).toBe(false);
    expect(validarCpf("111.111.111-11")).toBe(false);
  });
});

describe("CNPJ", () => {
  it("aceita CNPJ válido", () => {
    expect(validarCnpj("11.222.333/0001-81")).toBe(true);
    expect(validarCnpj("11222333000181")).toBe(true);
  });
  it("rejeita inválidos", () => {
    expect(validarCnpj("11.222.333/0001-80")).toBe(false);
    expect(validarCnpj("00000000000000")).toBe(false);
    expect(validarCnpj("123")).toBe(false);
  });
});

describe("máscaras", () => {
  it("CPF e CNPJ", () => {
    expect(mascararCpf("52998224725")).toBe("529.982.247-25");
    expect(mascararCpf("5299")).toBe("529.9");
    expect(mascararCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
  it("telefone", () => {
    expect(mascararTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(mascararTelefone("1133334444")).toBe("(11) 3333-4444");
    expect(mascararTelefone("1")).toBe("(1");
  });
});

describe("telefone e WhatsApp", () => {
  it("valida celular e fixo com DDD", () => {
    expect(validarTelefone("(11) 98765-4321")).toBe(true);
    expect(validarTelefone("(11) 3333-4444")).toBe(true);
    expect(validarTelefone("98765-4321")).toBe(false);
    expect(validarTelefone("(11) 88765-4321")).toBe(false);
  });
  it("monta link wa.me com DDI 55", () => {
    expect(linkWhatsapp("(11) 98765-4321")).toBe("https://wa.me/5511987654321");
    expect(linkWhatsapp("5511987654321")).toBe("https://wa.me/5511987654321");
    expect(linkWhatsapp("123")).toBeNull();
  });
});

describe("parseDecimalBR", () => {
  it("converte formatos pt-BR", () => {
    expect(parseDecimalBR("1.234,56")).toBe(1234.56);
    expect(parseDecimalBR("R$ 10")).toBe(10);
    expect(parseDecimalBR("2500.5")).toBe(2500.5);
    expect(parseDecimalBR("")).toBeNull();
    expect(parseDecimalBR("abc")).toBeNaN();
  });
});

describe("clienteSchema", () => {
  const base = { tipo: "lojista", pessoa: "pj", nome: "Oficina Exemplo", documento: "" } as const;

  it("normaliza campos e zera dia de fechamento para cliente final", () => {
    const r = clienteSchema.parse({
      ...base,
      tipo: "final",
      pessoa: "pf",
      documento: "529.982.247-25",
      telefone_whatsapp: "(11) 98765-4321",
      dia_fechamento: "10",
      limite_credito: "1.500,00",
      ie: "123",
    });
    expect(r.documento).toBe("52998224725");
    expect(r.telefone_whatsapp).toBe("11987654321");
    expect(r.dia_fechamento).toBeNull();
    expect(r.limite_credito).toBe(1500);
    expect(r.ie).toBeNull();
  });
  it("mantém dia de fechamento do lojista e valida o intervalo", () => {
    expect(clienteSchema.parse({ ...base, dia_fechamento: "15" }).dia_fechamento).toBe(15);
    expect(clienteSchema.safeParse({ ...base, dia_fechamento: "40" }).success).toBe(false);
  });
  it("rejeita documento inválido conforme PF/PJ", () => {
    expect(clienteSchema.safeParse({ ...base, documento: "11.222.333/0001-80" }).success).toBe(
      false,
    );
    expect(clienteSchema.safeParse({ ...base, documento: "11.222.333/0001-81" }).success).toBe(
      true,
    );
    expect(
      clienteSchema.safeParse({ ...base, pessoa: "pf", documento: "11222333000181" }).success,
    ).toBe(false);
  });
  it("rejeita nome curto, e-mail e limite inválidos", () => {
    expect(clienteSchema.safeParse({ ...base, nome: "A" }).success).toBe(false);
    expect(clienteSchema.safeParse({ ...base, email: "x@" }).success).toBe(false);
    expect(clienteSchema.safeParse({ ...base, limite_credito: "-5" }).success).toBe(false);
  });
});

describe("clienteRapidoSchema", () => {
  it("WhatsApp é opcional mas validado", () => {
    expect(clienteRapidoSchema.safeParse({ nome: "João", tipo: "final" }).success).toBe(true);
    expect(
      clienteRapidoSchema.safeParse({ nome: "João", tipo: "final", telefone_whatsapp: "123" })
        .success,
    ).toBe(false);
  });
});

describe("filtroClientesSchema", () => {
  it("usa padrões seguros para parâmetros inválidos", () => {
    expect(filtroClientesSchema.parse({ tipo: "x", pagina: "-3", situacao: "?" })).toEqual({
      q: "",
      tipo: "todos",
      situacao: "ativos",
      pagina: 1,
    });
  });
});
