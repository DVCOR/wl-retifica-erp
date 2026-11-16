import { describe, expect, it } from "vitest";
import { z } from "zod";
import { falhaValidacao, mensagemErroBanco, sucesso } from "./acao";

describe("acao", () => {
  it("mensagemErroBanco", () => {
    expect(mensagemErroBanco({ code: "P0001", message: "Tire ao menos 3 fotos" })).toBe("Tire ao menos 3 fotos");
    expect(mensagemErroBanco({ code: "42501", message: 'new row violates row-level security policy for table "x"' })).toBe(
      "Você não tem permissão para esta ação.",
    );
    expect(mensagemErroBanco({ code: "23505", message: "dup" })).toBe("Já existe um registro com estes dados.");
  });
  it("falhaValidacao agrupa por campo", () => {
    const r = z.object({ nome: z.string().min(2, "curto") }).safeParse({ nome: "a" });
    expect(r.success).toBe(false);
    if (!r.success) expect(falhaValidacao(r.error).campos).toEqual({ nome: ["curto"] });
  });
  it("sucesso", () => {
    expect(sucesso(1)).toEqual({ ok: true, dados: 1 });
  });
});
