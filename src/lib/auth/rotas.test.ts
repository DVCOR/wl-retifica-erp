import { describe, expect, it } from "vitest";
import { caminhoSeguro, ehRotaPublica, rotaEmpresa, slugDaRota } from "./rotas";

describe("rotas", () => {
  it("slugDaRota", () => {
    expect(slugDaRota("/wl-retifica/os/123")).toBe("wl-retifica");
    expect(slugDaRota("/login")).toBeNull();
    expect(slugDaRota("/os-publica/abc")).toBeNull();
    expect(slugDaRota("/")).toBeNull();
    expect(slugDaRota("/manifest.webmanifest")).toBeNull();
  });
  it("ehRotaPublica", () => {
    expect(ehRotaPublica("/login")).toBe(true);
    expect(ehRotaPublica("/convite/x")).toBe(true);
    expect(ehRotaPublica("/esqueci-senha")).toBe(true);
    expect(ehRotaPublica("/os-publica/x")).toBe(true);
    expect(ehRotaPublica("/auth/callback")).toBe(true);
    expect(ehRotaPublica("/wl/inicio")).toBe(false);
    expect(ehRotaPublica("/")).toBe(false);
  });
  it("caminhoSeguro evita open redirect", () => {
    expect(caminhoSeguro("/wl/os")).toBe("/wl/os");
    expect(caminhoSeguro("//evil.com")).toBe("/");
    expect(caminhoSeguro("https://evil.com")).toBe("/");
    expect(caminhoSeguro(null, "/x")).toBe("/x");
  });
  it("caminhoSeguro barra TAB/LF/barra invertida que o parser de URL transforma em //", () => {
    for (const ataque of [
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "/\\evil.com",
      "/x\\..\\..\\/evil.com",
    ]) {
      expect(caminhoSeguro(ataque)).toBe("/");
      // o destino final continua no próprio site
      expect(new URL(caminhoSeguro(ataque), "https://app.wl").origin).toBe("https://app.wl");
    }
  });
  it("caminhoSeguro preserva caminho, query e hash internos", () => {
    expect(caminhoSeguro("/wl/os?status=pronto#x")).toBe("/wl/os?status=pronto#x");
    expect(caminhoSeguro("/convite/abc")).toBe("/convite/abc");
  });
  it("rotaEmpresa", () => {
    expect(rotaEmpresa("wl", "os", "nova")).toBe("/wl/os/nova");
    expect(rotaEmpresa("wl")).toBe("/wl");
  });
});
