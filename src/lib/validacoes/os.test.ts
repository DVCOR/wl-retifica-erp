import { describe, expect, it } from "vitest";
import { cancelarSchema, entregaSchema } from "./os";

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
