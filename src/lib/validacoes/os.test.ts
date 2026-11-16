import { describe, expect, it } from "vitest";
import { cancelarSchema, corrigirChecklistSchema, entregaSchema } from "./os";

describe("validações de OS", () => {
  it("entrega normaliza documento e exige garantia numérica", () => {
    const r = entregaSchema.safeParse({
      nome: "Maria Silva",
      documento: "123.456.789-09",
      caminho_imagem: "emp/os/assinatura-entrega-x.png",
      garantia_dias: "90",
    });
    expect(r.success && r.data.documento).toBe("12345678909");
    expect(r.success && r.data.garantia_dias).toBe(90);
    expect(entregaSchema.safeParse({ nome: "Maria Silva", documento: "1", caminho_imagem: "xxxxxxxxxxx", garantia_dias: 1 }).success).toBe(false);
  });
  it("cancelamento exige motivo", () => {
    expect(cancelarSchema.safeParse({ motivo: " " }).success).toBe(false);
  });
});

describe("corrigirChecklistSchema", () => {
  const base = {
    item_id: "7f1c2a7e-6c1b-4b7a-9a2e-2d5d3f1e9a10",
    status: "ausente",
    quantidade: null,
    observacao: "",
    motivo: "Cliente trouxe a peça depois",
  };
  it("aceita correção com motivo", () => {
    expect(corrigirChecklistSchema.safeParse(base).success).toBe(true);
  });
  it("exige motivo com pelo menos 3 letras", () => {
    const r = corrigirChecklistSchema.safeParse({ ...base, motivo: "  a " });
    expect(r.success).toBe(false);
  });
  it("recusa status e quantidade inválidos", () => {
    expect(corrigirChecklistSchema.safeParse({ ...base, status: "quebrado" }).success).toBe(false);
    expect(corrigirChecklistSchema.safeParse({ ...base, quantidade: -1 }).success).toBe(false);
  });
});
