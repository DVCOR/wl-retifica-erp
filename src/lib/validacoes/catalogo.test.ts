import { describe, expect, it } from "vitest";
import {
  kitSchema,
  pecaSchema,
  precosTabelaSchema,
  servicoSchema,
  tabelaPrecoSchema,
} from "./catalogo";

const uuid = "11111111-1111-4111-8111-111111111111";
const uuid2 = "22222222-2222-4222-8222-222222222222";

describe("servicoSchema", () => {
  const ok = {
    codigo: "CAB-FACE",
    nome: "Plainar face",
    categoria: "Cabeçote",
    unidade: "un" as const,
    preco_base: 180,
    tempo_padrao_min: 60,
  };
  it("aceita um serviço válido e normaliza vazios para null", () => {
    const r = servicoSchema.parse({ ...ok, codigo: "  ", categoria: "", tempo_padrao_min: null });
    expect(r.codigo).toBeNull();
    expect(r.categoria).toBeNull();
    expect(r.tempo_padrao_min).toBeNull();
  });
  it("rejeita nome curto, unidade inválida e preço negativo", () => {
    expect(servicoSchema.safeParse({ ...ok, nome: "a" }).success).toBe(false);
    expect(servicoSchema.safeParse({ ...ok, unidade: "kg" }).success).toBe(false);
    expect(servicoSchema.safeParse({ ...ok, preco_base: -1 }).success).toBe(false);
  });
  it("tempo deve ser inteiro", () => {
    expect(servicoSchema.safeParse({ ...ok, tempo_padrao_min: 1.5 }).success).toBe(false);
  });
});

describe("pecaSchema", () => {
  it("custo é opcional, preço de venda obrigatório", () => {
    const base = { codigo: null, descricao: "Junta do cabeçote", marca: "", unidade: "un" };
    expect(pecaSchema.safeParse({ ...base, custo: null, preco_venda: 10 }).success).toBe(true);
    expect(pecaSchema.safeParse({ ...base, custo: null }).success).toBe(false);
  });
});

describe("tabelaPrecoSchema", () => {
  it("desconto entre 0 e 100", () => {
    const base = { nome: "Lojista", padrao_para: "lojista" as const };
    expect(tabelaPrecoSchema.safeParse({ ...base, desconto_padrao_pct: 15 }).success).toBe(true);
    expect(tabelaPrecoSchema.safeParse({ ...base, desconto_padrao_pct: 101 }).success).toBe(false);
    expect(tabelaPrecoSchema.safeParse({ ...base, desconto_padrao_pct: -1 }).success).toBe(false);
  });
});

describe("precosTabelaSchema", () => {
  it("aceita preço nulo (remover) e rejeita id inválido", () => {
    expect(
      precosTabelaSchema.safeParse({ itens: [{ tipo: "servico", id: uuid, preco: null }] }).success,
    ).toBe(true);
    expect(
      precosTabelaSchema.safeParse({ itens: [{ tipo: "peca", id: "x", preco: 1 }] }).success,
    ).toBe(false);
  });
});

describe("kitSchema", () => {
  const item = { tipo: "servico" as const, id: uuid, quantidade: 1 };
  it("exige ao menos um item", () => {
    expect(kitSchema.safeParse({ nome: "Kit", descricao: null, itens: [] }).success).toBe(false);
  });
  it("rejeita quantidade zero e itens repetidos", () => {
    expect(
      kitSchema.safeParse({ nome: "Kit", descricao: null, itens: [{ ...item, quantidade: 0 }] })
        .success,
    ).toBe(false);
    expect(kitSchema.safeParse({ nome: "Kit", descricao: null, itens: [item, item] }).success).toBe(
      false,
    );
  });
  it("aceita serviço e peça com o mesmo id de tipos diferentes", () => {
    expect(
      kitSchema.safeParse({
        nome: "Retífica completa de cabeçote 8v",
        descricao: "",
        itens: [item, { tipo: "peca", id: uuid2, quantidade: 8 }],
      }).success,
    ).toBe(true);
  });
});
