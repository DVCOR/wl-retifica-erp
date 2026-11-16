import { describe, expect, it } from "vitest";
import { ehErroDeRede, mensagemErroLogin } from "./erros-login";

describe("mensagens de erro do login", () => {
  it("distingue falha de rede de senha errada (modo local)", () => {
    const rede = mensagemErroLogin({ name: "AuthRetryableFetchError", status: 0 }, true);
    expect(rede).toContain("servidor da oficina");
    const senha = mensagemErroLogin({ code: "invalid_credentials", status: 400 }, true);
    expect(senha).toBe("Usuário ou senha incorretos.");
    expect(senha).not.toBe(rede);
  });

  it("distingue falha de rede de senha errada (nuvem)", () => {
    expect(mensagemErroLogin({ code: "invalid_credentials", status: 400 }, false)).toBe(
      "E-mail ou senha incorretos.",
    );
    expect(mensagemErroLogin({ status: 503 }, false)).toContain("conexão");
    expect(mensagemErroLogin({ message: "fetch failed" }, false)).toContain("conexão");
  });

  it("reconhece erro de rede", () => {
    expect(ehErroDeRede({ name: "AuthRetryableFetchError" })).toBe(true);
    expect(ehErroDeRede({ status: 502 })).toBe(true);
    expect(ehErroDeRede({ message: "connect ECONNREFUSED 127.0.0.1:8000" })).toBe(true);
    expect(ehErroDeRede({ code: "invalid_credentials", status: 400 })).toBe(false);
  });

  it("trata os demais casos", () => {
    expect(mensagemErroLogin({ code: "email_not_confirmed", status: 400 }, false)).toContain(
      "Confirme seu e-mail",
    );
    expect(mensagemErroLogin({ code: "email_not_confirmed", status: 400 }, true)).toContain("dono");
    expect(mensagemErroLogin({ code: "user_banned", status: 400 }, true)).toContain("desativado");
    expect(mensagemErroLogin({ status: 429 }, true)).toContain("Muitas tentativas");
    expect(mensagemErroLogin({ status: 500, code: "unexpected_failure" }, true)).toContain(
      "Não foi possível entrar",
    );
  });
});
