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
