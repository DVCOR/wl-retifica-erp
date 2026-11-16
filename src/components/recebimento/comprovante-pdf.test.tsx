import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DadosComprovante } from "@/lib/data/recebimento";
import { montarDadosPdf } from "@/lib/recebimento/comprovante-dados";
import { ComprovantePdf } from "./comprovante-pdf";

const logo = readFileSync(path.join(process.cwd(), "public", "brand", "wl-logo.png"));
// JPEG mínimo (1x1) só para exercitar as miniaturas
const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

function dadosBase(): DadosComprovante {
  return {
    empresa: {
      nome_fantasia: "WL Retífica de Motores",
      razao_social: "WL Retífica de Motores Ltda",
      cnpj: "12345678000195",
      telefone: "11999990000",
      email: null,
      endereco: {
        logradouro: "R. Dr. Mathias José de Barros Ponikwar",
        numero: "254",
        bairro: "Jardim Campo Belo",
        uf: "SP",
      },
    },
    recebidoPor: "Ana",
    recebidoEm: "2026-11-15T14:30:00Z",
    miniaturas: [jpeg, jpeg, jpeg],
    assinaturaImagem: logo,
    os: {
      id: "0a000000-0000-4000-8000-000000000002",
      numero: "2026-000152",
      status: "recebido",
      prazo_prometido: "2026-11-30",
      observacoes: "Cliente pediu urgência",
      cliente_final_nome: "Carlos",
      cliente_final_placa: "ABC1D23",
      cliente_final_telefone: "11988887777",
      checklist_concluido_em: "2026-11-15T14:00:00Z",
      token_publico: "t",
      cliente: {
        id: "c",
        nome: "Oficina Exemplo A",
        nome_fantasia: null,
        tipo: "lojista",
        telefone_whatsapp: "11999990000",
        documento: "12345678909",
      },
      motor: {
        id: "m",
        marca: "VW",
        modelo: "EA111 1.6 8v",
        codigo_motor: null,
        numero_serie: "XYZ123",
        combustivel: "flex",
        cilindros: 4,
        veiculo_placa: null,
      },
      itens: [
        {
          id: "1",
          grupo: "Cabeçote · estrutura",
          descricao: "Face do cabeçote",
          ordem: 1,
          exige_quantidade: false,
          status: "danificado",
          quantidade: null,
          observacao: "Empenada, com trinca na lateral",
        },
        {
          id: "2",
          grupo: "Cabeçote · componentes",
          descricao: "Molas de válvula",
          ordem: 2,
          exige_quantidade: true,
          status: "ausente",
          quantidade: 8,
          observacao: null,
        },
        {
          id: "3",
          grupo: "Distribuição",
          descricao: "Tampa frontal",
          ordem: 3,
          exige_quantidade: false,
          status: "na",
          quantidade: null,
          observacao: null,
        },
      ],
      fotos: [],
      assinatura: {
        nome: "Maria da Silva",
        documento: "12345678909",
        created_at: "2026-11-15T14:31:00Z",
      },
      pendenciaRecebido: null,
    },
  };
}

describe("PDF do comprovante de recebimento", () => {
  it("mapeia divergências, grupos N/A e dados formatados", () => {
    const d = montarDadosPdf(dadosBase(), logo);
    expect(d.numeroOs).toBe("2026-000152");
    expect(d.divergencias.map((x) => [x.descricao, x.status])).toEqual([
      ["Face do cabeçote", "Danificado"],
      ["Molas de válvula (8)", "Ausente"],
    ]);
    expect(d.gruposNa).toEqual(["Distribuição"]);
    expect(d.empresa.cnpj).toBe("12.345.678/0001-95");
    expect(d.empresa.endereco).toContain("254");
    expect(d.carro?.placa).toBe("ABC1D23"); // Mercosul sem hífen
    expect(d.motor).toBe("VW EA111 1.6 8v");
    expect(d.prazo).toBe("30/11/2026");
  });

  it("gera um PDF válido com divergências, fotos e assinatura", async () => {
    const buf = await renderToBuffer(ComprovantePdf({ dados: montarDadosPdf(dadosBase(), logo) }));
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(2000);
  }, 30000);

  it("gera PDF sem divergências, sem fotos e sem logo", async () => {
    const base = dadosBase();
    base.os.itens = base.os.itens.map((i) => ({ ...i, status: "ok" as const }));
    base.miniaturas = [];
    base.assinaturaImagem = null;
    const buf = await renderToBuffer(ComprovantePdf({ dados: montarDadosPdf(base, null) }));
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30000);
});
