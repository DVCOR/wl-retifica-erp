import { describe, expect, it } from "vitest";
import { rotaDaEtiqueta } from "./qr";

const id = "0b2f3c1e-8d6a-4f10-9a77-3a1f6c2d9e55";
describe("rotaDaEtiqueta", () => {
  it("aceita caminho, URL da mesma origem e id puro", () => {
    expect(rotaDaEtiqueta(`/wl-retifica/os/${id}`, "x")).toBe(`/wl-retifica/os/${id}`);
    expect(rotaDaEtiqueta(`https://app.exemplo.com/wl/os/${id}`, "x", "https://app.exemplo.com")).toBe(`/wl/os/${id}`);
    expect(rotaDaEtiqueta(id, "wl")).toBe(`/wl/os/${id}`);
  });
  it("recusa origem externa e lixo", () => {
    expect(rotaDaEtiqueta(`https://malicioso.com/wl/os/${id}`, "wl", "https://app.exemplo.com")).toBeNull();
    expect(rotaDaEtiqueta("qualquer coisa", "wl")).toBeNull();
  });
});
