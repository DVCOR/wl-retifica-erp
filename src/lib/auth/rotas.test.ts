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
  it("rotaEmpresa", () => {
    expect(rotaEmpresa("wl", "os", "nova")).toBe("/wl/os/nova");
    expect(rotaEmpresa("wl")).toBe("/wl");
  });
});
