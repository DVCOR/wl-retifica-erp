import { describe, expect, it } from "vitest";
import {
  atualizarItemSchema,
  medicaoSchema,
  respostaPublicaSchema,
  respostaPresencialSchema,
} from "./orcamento";

describe("validações do orçamento", () => {
  it("exige nome na resposta pública", () => {
    expect(respostaPublicaSchema.safeParse({ aprovar: true, nome: " " }).success).toBe(false);
    expect(respostaPublicaSchema.safeParse({ aprovar: true, nome: "Ana" }).success).toBe(true);
  });
  it("aceita só canais do balcão", () => {
    const base = { orcamento_id: crypto.randomUUID(), aprovar: true, nome: "Ana" };
    expect(respostaPresencialSchema.safeParse({ ...base, canal: "whatsapp" }).success).toBe(true);
    expect(respostaPresencialSchema.safeParse({ ...base, canal: "link" }).success).toBe(false);
  });
  it("rejeita quantidade zero e preço negativo", () => {
    expect(atualizarItemSchema.safeParse({ quantidade: 0 }).success).toBe(false);
    expect(atualizarItemSchema.safeParse({ preco_unitario: -1 }).success).toBe(false);
    expect(atualizarItemSchema.safeParse({ quantidade: 2, desconto: 5 }).success).toBe(true);
  });
  it("medição numérica exige valor; teste exige resultado", () => {
    const base = { componente: "Cabeçote", descricao: "Empenamento" };
    expect(medicaoSchema.safeParse({ ...base, tipo: "numerica" }).success).toBe(false);
    expect(medicaoSchema.safeParse({ ...base, tipo: "numerica", valor: 0.05, maximo: 0.1 }).success).toBe(true);
    expect(medicaoSchema.safeParse({ ...base, tipo: "numerica", valor: 1, minimo: 5, maximo: 2 }).success).toBe(false);
    expect(medicaoSchema.safeParse({ ...base, tipo: "teste" }).success).toBe(false);
    expect(medicaoSchema.safeParse({ ...base, tipo: "teste", aprovado: false }).success).toBe(true);
  });
});
