/* eslint-disable jsx-a11y/alt-text -- <Image> do @react-pdf não é <img> HTML */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatarData, formatarMoeda } from "@/lib/format";
import { formatarFaixa, formatarNumero } from "@/lib/orcamento/medicao";

/** Paleta espelha os tokens de src/app/globals.css (o PDF não lê variáveis CSS). */
const COR = {
  preto: "#0e0e10",
  primaria: "#c8102e",
  texto: "#111827",
  secundario: "#4b5563",
  borda: "#d1d5db",
  fundo: "#f3f4f6",
  perigo: "#b91c1c",
  sucesso: "#15803d",
};

const e = StyleSheet.create({
  pagina: { padding: 32, fontSize: 10, color: COR.texto, fontFamily: "Helvetica" },
  topo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: COR.primaria,
  },
  logo: { width: 96, height: 49, objectFit: "contain" },
  empresa: { flex: 1, gap: 1 },
  empresaNome: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  pequeno: { fontSize: 8.5, color: COR.secundario },
  numeroBox: { alignItems: "flex-end", gap: 2 },
  numero: { fontSize: 15, fontFamily: "Courier-Bold" },
  titulo: { marginTop: 14, fontSize: 15, fontFamily: "Helvetica-Bold" },
  grade: { flexDirection: "row", gap: 10, marginTop: 10 },
  caixa: { flex: 1, borderWidth: 1, borderColor: COR.borda, borderRadius: 4, padding: 8, gap: 2 },
  caixaTitulo: { fontSize: 8, color: COR.secundario, textTransform: "uppercase", marginBottom: 2 },
  forte: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  secao: { marginTop: 14, fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  cab: { flexDirection: "row", backgroundColor: COR.fundo, paddingVertical: 4, paddingHorizontal: 6, gap: 8 },
  linha: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COR.borda,
    gap: 8,
  },
  cDesc: { flex: 1 },
  cQtd: { width: 38, textAlign: "right" },
  cPreco: { width: 66, textAlign: "right" },
  cDescto: { width: 58, textAlign: "right" },
  cTotal: { width: 72, textAlign: "right" },
  totais: { marginTop: 8, alignSelf: "flex-end", width: 220, gap: 3 },
  totalLinha: { flexDirection: "row", justifyContent: "space-between" },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COR.texto,
    paddingTop: 4,
    marginTop: 2,
  },
  totalValor: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  conforme: { color: COR.sucesso, fontFamily: "Helvetica-Bold" },
  naoConforme: { color: COR.perigo, fontFamily: "Helvetica-Bold" },
  obs: { marginTop: 12, padding: 8, backgroundColor: COR.fundo, borderRadius: 4, fontSize: 9 },
  rodape: { marginTop: 18, fontSize: 8.5, color: COR.secundario, textAlign: "center" },
});

export type DadosOrcamentoPdf = {
  empresa: { nome: string; endereco: string; contato: string };
  logo: Buffer | null;
  os: { numero: string; cliente: string; motor: string; placa: string };
  orcamento: {
    versao: number;
    status: string;
    validade: string | null;
    observacoes: string | null;
    subtotal: number;
    desconto: number;
    total: number;
    itens: {
      descricao: string;
      quantidade: number;
      preco_unitario: number;
      desconto: number;
      total: number;
    }[];
  };
  medicoes: {
    componente: string;
    descricao: string;
    valor: string;
    unidade: string | null;
    faixa: string;
    conforme: boolean | null;
  }[] | null;
};

export function montarMedicaoPdf(m: {
  componente: string;
  descricao: string;
  valor: number | null;
  valor_texto: string | null;
  unidade: string | null;
  minimo: number | null;
  maximo: number | null;
  conforme: boolean | null;
}) {
  return {
    componente: m.componente,
    descricao: m.descricao,
    valor: m.valor !== null ? formatarNumero(m.valor) : (m.valor_texto ?? ""),
    unidade: m.valor !== null ? m.unidade : null,
    faixa: formatarFaixa(m.minimo, m.maximo, m.unidade),
    conforme: m.conforme,
  };
}

/** Devolve o <Document> direto (renderToBuffer exige esse elemento). */
export function OrcamentoPdf({ dados }: { dados: DadosOrcamentoPdf }) {
  const { empresa, os, orcamento: o, medicoes } = dados;
  return (
    <Document title={`Orçamento OS ${os.numero}`} author={empresa.nome}>
      <Page size="A4" style={e.pagina}>
        <View style={e.topo}>
          {dados.logo && <Image src={dados.logo} style={e.logo} />}
          <View style={e.empresa}>
            <Text style={e.empresaNome}>{empresa.nome}</Text>
            {empresa.endereco ? <Text style={e.pequeno}>{empresa.endereco}</Text> : null}
            {empresa.contato ? <Text style={e.pequeno}>{empresa.contato}</Text> : null}
          </View>
          <View style={e.numeroBox}>
            <Text style={e.pequeno}>OS</Text>
            <Text style={e.numero}>{os.numero}</Text>
          </View>
        </View>

        <Text style={e.titulo}>Orçamento · versão {o.versao}</Text>
        <View style={e.grade}>
          <View style={e.caixa}>
            <Text style={e.caixaTitulo}>Cliente</Text>
            <Text style={e.forte}>{os.cliente}</Text>
            {os.placa ? <Text style={e.pequeno}>Placa: {os.placa}</Text> : null}
          </View>
          <View style={e.caixa}>
            <Text style={e.caixaTitulo}>Motor</Text>
            <Text style={e.forte}>{os.motor || "—"}</Text>
          </View>
          <View style={e.caixa}>
            <Text style={e.caixaTitulo}>Validade</Text>
            <Text style={e.forte}>{o.validade ? formatarData(o.validade) : "—"}</Text>
          </View>
        </View>

        <Text style={e.secao}>Itens</Text>
        <View style={e.cab}>
          <Text style={e.cDesc}>Descrição</Text>
          <Text style={e.cQtd}>Qtd</Text>
          <Text style={e.cPreco}>Unitário</Text>
          <Text style={e.cDescto}>Desc.</Text>
          <Text style={e.cTotal}>Total</Text>
        </View>
        {o.itens.map((i, idx) => (
          <View key={idx} style={e.linha} wrap={false}>
            <Text style={e.cDesc}>{i.descricao}</Text>
            <Text style={e.cQtd}>{formatarNumero(i.quantidade)}</Text>
            <Text style={e.cPreco}>{formatarMoeda(i.preco_unitario)}</Text>
            <Text style={e.cDescto}>{i.desconto > 0 ? formatarMoeda(i.desconto) : "—"}</Text>
            <Text style={e.cTotal}>{formatarMoeda(i.total)}</Text>
          </View>
        ))}
        <View style={e.totais} wrap={false}>
          {o.desconto > 0 && (
            <>
              <View style={e.totalLinha}>
                <Text>Subtotal</Text>
                <Text>{formatarMoeda(o.subtotal)}</Text>
              </View>
              <View style={e.totalLinha}>
                <Text>Desconto</Text>
                <Text>−{formatarMoeda(o.desconto)}</Text>
              </View>
            </>
          )}
          <View style={e.totalFinal}>
            <Text style={e.forte}>Total</Text>
            <Text style={e.totalValor}>{formatarMoeda(o.total)}</Text>
          </View>
        </View>

        {o.observacoes ? (
          <View style={e.obs} wrap={false}>
            <Text>{o.observacoes}</Text>
          </View>
        ) : null}

        {medicoes && medicoes.length > 0 && (
          <>
            <Text style={e.secao}>Laudo técnico</Text>
            <View style={e.cab}>
              <Text style={e.cDesc}>Componente / medição</Text>
              <Text style={e.cPreco}>Medido</Text>
              <Text style={[e.cPreco, { width: 90 }]}>Faixa</Text>
              <Text style={e.cDescto}>Situação</Text>
            </View>
            {medicoes.map((m, idx) => (
              <View key={idx} style={e.linha} wrap={false}>
                <Text style={e.cDesc}>
                  {m.componente} · {m.descricao}
                </Text>
                <Text style={e.cPreco}>
                  {m.valor}
                  {m.unidade ? ` ${m.unidade}` : ""}
                </Text>
                <Text style={[e.cPreco, { width: 90 }]}>{m.faixa || "—"}</Text>
                <Text style={[e.cDescto, m.conforme === false ? e.naoConforme : e.conforme]}>
                  {m.conforme === null ? "—" : m.conforme ? "Conforme" : "Fora"}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={e.rodape}>
          Orçamento sujeito à aprovação do cliente e válido até{" "}
          {o.validade ? formatarData(o.validade) : "a data informada"}.
        </Text>
      </Page>
    </Document>
  );
}
