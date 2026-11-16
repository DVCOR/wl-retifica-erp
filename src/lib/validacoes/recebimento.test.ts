import { describe, expect, it } from "vitest";
import {
  assinaturaSchema,
  atualizarItemSchema,
  clienteRapidoSchema,
  marcarGrupoSchema,
  motorRapidoSchema,
  normalizarPlaca,
  novaOsSchema,
  registrarAnexoSchema,
} from "./recebimento";

const UUID = "0a000000-0000-4000-8000-000000000002";

describe("clienteRapidoSchema", () => {
  it("aceita nome e tipo; telefone e documento viram dígitos", () => {
    const r = clienteRapidoSchema.parse({
      tipo: "lojista",
      nome: "  Oficina A ",
      telefone_whatsapp: "(11) 99999-0000",
      documento: "12.345.678/0001-95",
    });
    expect(r).toEqual({
      tipo: "lojista",
      nome: "Oficina A",
      telefone_whatsapp: "11999990000",
      documento: "12345678000195",
    });
  });
  it("campos opcionais vazios viram undefined", () => {
    const r = clienteRapidoSchema.parse({
      tipo: "final",
      nome: "João",
      telefone_whatsapp: "",
      documento: "",
    });
    expect(r.telefone_whatsapp).toBeUndefined();
    expect(r.documento).toBeUndefined();
  });
  it("rejeita nome curto, telefone e documento inválidos", () => {
    const r = clienteRapidoSchema.safeParse({
      tipo: "final",
      nome: "J",
      telefone_whatsapp: "123",
      documento: "12345",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const campos = r.error.issues.map((i) => i.path[0]);
      expect(campos).toEqual(expect.arrayContaining(["nome", "telefone_whatsapp", "documento"]));
    }
  });
  it("tipo é obrigatório", () => {
    expect(clienteRapidoSchema.safeParse({ nome: "João" }).success).toBe(false);
  });
});

describe("motorRapidoSchema", () => {
  it("exige ao menos uma identificação do motor", () => {
    expect(motorRapidoSchema.safeParse({ cliente_id: UUID }).success).toBe(false);
    expect(motorRapidoSchema.safeParse({ cliente_id: UUID, modelo: "Gol 1.6" }).success).toBe(true);
  });
  it("normaliza placa e converte números", () => {
    const r = motorRapidoSchema.parse({
      cliente_id: UUID,
      codigo_motor: "EA111",
      veiculo_placa: "abc-1d23",
      cilindros: "4",
      combustivel: "",
    });
    expect(r.veiculo_placa).toBe("ABC1D23");
    expect(r.cilindros).toBe(4);
    expect(r.combustivel).toBeUndefined();
  });
  it("rejeita placa e cilindros inválidos", () => {
    expect(
      motorRapidoSchema.safeParse({ cliente_id: UUID, modelo: "x", veiculo_placa: "12" }).success,
    ).toBe(false);
    expect(
      motorRapidoSchema.safeParse({ cliente_id: UUID, modelo: "x", cilindros: 40 }).success,
    ).toBe(false);
  });
});

describe("novaOsSchema", () => {
  it("aceita só o cliente e trata strings vazias como ausentes", () => {
    const r = novaOsSchema.parse({
      cliente_id: UUID,
      motor_id: "",
      prazo_prometido: "",
      observacoes: "",
    });
    expect(r.motor_id).toBeUndefined();
    expect(r.prazo_prometido).toBeUndefined();
    expect(r.observacoes).toBeUndefined();
  });
  it("valida prazo, placa e telefone do cliente do lojista", () => {
    expect(
      novaOsSchema.safeParse({ cliente_id: UUID, prazo_prometido: "15/11/2026" }).success,
    ).toBe(false);
    expect(novaOsSchema.safeParse({ cliente_id: UUID, cliente_final_placa: "zzz" }).success).toBe(
      false,
    );
    const ok = novaOsSchema.parse({
      cliente_id: UUID,
      prazo_prometido: "2026-12-01",
      cliente_final_nome: "Carlos",
      cliente_final_placa: "abc1d23",
      cliente_final_telefone: "(11) 98888-7777",
    });
    expect(ok.cliente_final_placa).toBe("ABC1D23");
    expect(ok.cliente_final_telefone).toBe("11988887777");
  });
  it("rejeita cliente que não é uuid", () => {
    expect(novaOsSchema.safeParse({ cliente_id: "abc" }).success).toBe(false);
  });
});

describe("checklist e anexos", () => {
  it("atualização de item exige ao menos um campo e status válido", () => {
    expect(atualizarItemSchema.safeParse({}).success).toBe(false);
    expect(atualizarItemSchema.safeParse({ status: "quebrado" }).success).toBe(false);
    expect(atualizarItemSchema.safeParse({ status: "danificado" }).success).toBe(true);
    expect(atualizarItemSchema.safeParse({ quantidade: -1 }).success).toBe(false);
    expect(atualizarItemSchema.safeParse({ quantidade: 8, observacao: null }).success).toBe(true);
  });
  it("grupo só vira N/A ou volta para OK", () => {
    expect(marcarGrupoSchema.safeParse({ grupo: "Bloco", status: "na" }).success).toBe(true);
    expect(marcarGrupoSchema.safeParse({ grupo: "Bloco", status: "ausente" }).success).toBe(false);
  });
  it("registro de anexo valida item uuid ou null", () => {
    expect(
      registrarAnexoSchema.safeParse({ caminho: "e/o/geral-1.jpg", checklist_item_id: null })
        .success,
    ).toBe(true);
    expect(
      registrarAnexoSchema.safeParse({ caminho: "e/o/geral-1.jpg", checklist_item_id: "x" })
        .success,
    ).toBe(false);
  });
});

describe("assinaturaSchema", () => {
  const base = {
    nome: "Maria da Silva",
    documento: "123.456.789-09",
    caminho_imagem: "e/o/assinatura-1.png",
  };
  it("aceita CPF e limpa a pontuação", () => {
    expect(assinaturaSchema.parse(base).documento).toBe("12345678909");
  });
  it("aceita RG com letras", () => {
    expect(assinaturaSchema.safeParse({ ...base, documento: "MG-12.345.678" }).success).toBe(true);
  });
  it("rejeita nome curto e documento curto", () => {
    expect(assinaturaSchema.safeParse({ ...base, nome: "Ma" }).success).toBe(false);
    expect(assinaturaSchema.safeParse({ ...base, documento: "123" }).success).toBe(false);
  });
});

describe("normalizarPlaca", () => {
  it("maiúscula, sem hífen e espaços", () => {
    expect(normalizarPlaca("abc-1234")).toBe("ABC1234");
    expect(normalizarPlaca(" abc 1d23 ")).toBe("ABC1D23");
  });
});
