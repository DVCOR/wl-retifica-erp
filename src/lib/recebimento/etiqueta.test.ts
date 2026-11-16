import { describe, expect, it } from "vitest";
import { escaparHtml, gerarHtmlEtiqueta } from "./etiqueta";

describe("etiqueta", () => {
  it("escapa HTML", () => {
    expect(escaparHtml(`<b>"A" & 'B'</b>`)).toBe(
      "&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;",
    );
  });
  it("gera 60×40 mm com QR, número e cliente; imprime só quando pedido", () => {
    const base = {
      numeroOs: "2026-000152",
      cliente: "Oficina <X>",
      empresa: "WL",
      qrDataUrl: "data:image/png;base64,AAA",
    };
    const html = gerarHtmlEtiqueta(base);
    expect(html).toContain("size: 60mm 40mm");
    expect(html).toContain("data:image/png;base64,AAA");
    expect(html).toContain("2026-000152");
    expect(html).toContain("Oficina &lt;X&gt;");
    expect(html).not.toContain("window.print(); }, 300");
    expect(gerarHtmlEtiqueta({ ...base, imprimirAoAbrir: true })).toContain(
      "window.print(); }, 300",
    );
  });
});
