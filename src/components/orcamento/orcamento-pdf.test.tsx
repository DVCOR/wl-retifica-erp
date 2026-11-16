import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { montarMedicaoPdf, OrcamentoPdf, type DadosOrcamentoPdf } from "./orcamento-pdf";

const logo = readFileSync(path.join(process.cwd(), "public", "brand", "wl-logo.png"));

function dados(comLaudo: boolean): DadosOrcamentoPdf {
  return {
    empresa: { nome: "WL Retífica de Motores", endereco: "R. Dr. Mathias, 254", contato: "(11) 99999-0000" },
    logo,
    os: { numero: "2026-000145", cliente: "Auto Center Silva", motor: "Ford Sigma 1.6", placa: "ABC-1D23" },
    orcamento: {
      versao: 2,
      status: "enviado",
      validade: "2026-11-22",
      observacoes: "Prazo de 5 dias úteis após aprovação.",
      subtotal: 500,
      desconto: 50,
      total: 450,
      itens: [
        { descricao: "Plainar face do cabeçote", quantidade: 1, preco_unitario: 200, desconto: 0, total: 200 },
        { descricao: "Retificar sedes (16 válvulas)", quantidade: 16, preco_unitario: 18.75, desconto: 0, total: 300 },
      ],
    },
    medicoes: comLaudo
      ? [
          montarMedicaoPdf({
            componente: "Cabeçote",
            descricao: "Empenamento da face",
            valor: 0.25,
            valor_texto: null,
            unidade: "mm",
            minimo: 0,
            maximo: 0.1,
            conforme: false,
          }),
        ]
      : null,
  };
}

describe("PDF do orçamento", () => {
  it("gera PDF com e sem laudo", async () => {
    for (const laudo of [false, true]) {
      const buf = await renderToBuffer(OrcamentoPdf({ dados: dados(laudo) }));
      expect(buf.subarray(0, 4).toString()).toBe("%PDF");
      expect(buf.length).toBeGreaterThan(1500);
    }
  });
});
