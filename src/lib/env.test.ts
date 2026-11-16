import { describe, expect, it } from "vitest";
import { nomeCookieSessao } from "./env";

describe("env", () => {
  it("nome do cookie vem do host público (igual ao padrão do @supabase/ssr)", () => {
    expect(nomeCookieSessao("https://abcd.supabase.co")).toBe("sb-abcd-auth-token");
    expect(nomeCookieSessao("http://127.0.0.1:54321")).toBe("sb-127-auth-token");
    expect(nomeCookieSessao("http://192.168.0.10:8000")).toBe("sb-192-auth-token");
    expect(nomeCookieSessao("lixo")).toBe("sb-local-auth-token");
  });
});

describe("urlParaNavegador no modo local (mesma origem)", () => {
  it("devolve só o caminho para a foto abrir pelo nome ou pelo IP", async () => {
    const { urlParaNavegador, SUPABASE_URL_SERVIDOR } = await import("./env");
    const base = SUPABASE_URL_SERVIDOR.replace(/\/$/, "");
    expect(urlParaNavegador(`${base}/storage/v1/object/sign/os-anexos/a.jpg?token=x`, true)).toBe(
      "/storage/v1/object/sign/os-anexos/a.jpg?token=x",
    );
  });
  it("não mexe em URL de outro host", async () => {
    const { urlParaNavegador } = await import("./env");
    expect(urlParaNavegador("https://exemplo.com/x.jpg", true)).toBe("https://exemplo.com/x.jpg");
  });
});
