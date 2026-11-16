import { describe, expect, it, vi } from "vitest";
import { acessoParaExibir, normalizarAcesso } from "./auth";
import {
  alterarAtivoSchema,
  criarUsuarioSchema,
  mudarPapelSchema,
  redefinirSenhaSchema,
  validarAlteracaoMembro,
} from "./usuarios";

const ID = "6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const ID2 = "11111111-2222-4333-8444-555555555555";

describe("acesso (e-mail ou login)", () => {
  it("login simples vira e-mail interno @wl.local", () => {
    expect(normalizarAcesso("balcao1")).toBe("balcao1@wl.local");
    expect(normalizarAcesso("  Balcao.2 ")).toBe("balcao.2@wl.local");
  });
  it("e-mail é mantido (minúsculo)", () => {
    expect(normalizarAcesso("Joao@Oficina.com")).toBe("joao@oficina.com");
  });
  it("rejeita lixo", () => {
    expect(normalizarAcesso("")).toBeNull();
    expect(normalizarAcesso("ab")).toBeNull();
    expect(normalizarAcesso("com espaço")).toBeNull();
    expect(normalizarAcesso("a@b")).toBeNull();
    expect(normalizarAcesso("x".repeat(31))).toBeNull();
  });
  it("mostra só o login quando o e-mail é interno", () => {
    expect(acessoParaExibir("balcao1@wl.local")).toBe("balcao1");
    expect(acessoParaExibir("joao@oficina.com")).toBe("joao@oficina.com");
    expect(acessoParaExibir(null)).toBe("");
  });
});

describe("criarUsuarioSchema", () => {
  const base = { nome: "Maria", acesso: "balcao1", senha: "abc123", papel: "balcao" };
  it("aceita só login e gera e-mail interno", () => {
    const r = criarUsuarioSchema.safeParse(base);
    expect(r.success && r.data.acesso).toBe("balcao1@wl.local");
  });
  it("aceita e-mail", () => {
    const r = criarUsuarioSchema.safeParse({ ...base, acesso: "maria@x.com" });
    expect(r.success && r.data.acesso).toBe("maria@x.com");
  });
  it("valida nome, senha, papel e acesso", () => {
    expect(criarUsuarioSchema.safeParse({ ...base, nome: " " }).success).toBe(false);
    expect(criarUsuarioSchema.safeParse({ ...base, senha: "123" }).success).toBe(false);
    expect(criarUsuarioSchema.safeParse({ ...base, papel: "admin" }).success).toBe(false);
    expect(criarUsuarioSchema.safeParse({ ...base, acesso: "a b" }).success).toBe(false);
    expect(criarUsuarioSchema.safeParse({ ...base, acesso: "x@" }).success).toBe(false);
  });
});

describe("demais schemas", () => {
  it("redefinir senha", () => {
    expect(redefinirSenhaSchema.safeParse({ membro_id: ID, senha: "novaSenha" }).success).toBe(
      true,
    );
    expect(redefinirSenhaSchema.safeParse({ membro_id: ID, senha: "123" }).success).toBe(false);
    expect(redefinirSenhaSchema.safeParse({ membro_id: "x", senha: "novaSenha" }).success).toBe(
      false,
    );
  });
  it("mudar papel e ativar", () => {
    expect(mudarPapelSchema.safeParse({ membro_id: ID, papel: "tecnico" }).success).toBe(true);
    expect(mudarPapelSchema.safeParse({ membro_id: ID, papel: "root" }).success).toBe(false);
    expect(alterarAtivoSchema.safeParse({ membro_id: ID, ativo: false }).success).toBe(true);
    expect(alterarAtivoSchema.safeParse({ membro_id: ID, ativo: "sim" }).success).toBe(false);
  });
});

describe("validarAlteracaoMembro (proteção do dono)", () => {
  const dono = { alvoId: ID, euId: ID, papelAtualAlvo: "dono", alvoAtivo: true } as const;
  it("ninguém se desativa", () => {
    expect(validarAlteracaoMembro({ ...dono, novoAtivo: false, donosAtivos: 2 })).toMatch(
      /próprio usuário/,
    );
  });
  it("último dono não deixa de ser dono", () => {
    expect(validarAlteracaoMembro({ ...dono, novoPapel: "balcao", donosAtivos: 1 })).toMatch(
      /último dono/,
    );
  });
  it("com outro dono ativo, dono pode mudar o próprio papel", () => {
    expect(validarAlteracaoMembro({ ...dono, novoPapel: "balcao", donosAtivos: 2 })).toBeNull();
  });
  it("dono pode desativar outro dono se sobra um", () => {
    const alvo = { ...dono, alvoId: ID2, novoAtivo: false };
    expect(validarAlteracaoMembro({ ...alvo, donosAtivos: 2 })).toBeNull();
    expect(validarAlteracaoMembro({ ...alvo, donosAtivos: 1 })).toMatch(/ao menos um dono/);
  });
  it("mudanças comuns passam", () => {
    expect(
      validarAlteracaoMembro({
        alvoId: ID2,
        euId: ID,
        papelAtualAlvo: "balcao",
        alvoAtivo: true,
        novoPapel: "tecnico",
        donosAtivos: 1,
      }),
    ).toBeNull();
    expect(
      validarAlteracaoMembro({
        alvoId: ID2,
        euId: ID,
        papelAtualAlvo: "tecnico",
        alvoAtivo: false,
        novoAtivo: true,
        donosAtivos: 1,
      }),
    ).toBeNull();
  });
});

describe("loginSenhaSchema conforme o modo", () => {
  it("modo local aceita só o login; nuvem exige e-mail", async () => {
    const { loginSenhaSchema } = await import("./auth");
    vi.stubEnv("NEXT_PUBLIC_MODO_LOCAL", "true");
    const local = loginSenhaSchema.safeParse({ email: "Balcao1", senha: "abc123" });
    expect(local.success && local.data.email).toBe("balcao1@wl.local");
    vi.stubEnv("NEXT_PUBLIC_MODO_LOCAL", "false");
    expect(loginSenhaSchema.safeParse({ email: "balcao1", senha: "abc123" }).success).toBe(false);
    expect(loginSenhaSchema.safeParse({ email: "a@b.com", senha: "abc123" }).success).toBe(true);
    vi.unstubAllEnvs();
  });
});
