/* eslint-disable jsx-a11y/alt-text -- <Image> do @react-pdf não é <img> HTML */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DadosPdfComprovante } from "@/lib/recebimento/comprovante-dados";

/**
 * O PDF não lê as variáveis CSS do tema: esta paleta espelha os tokens de
 * src/app/globals.css (preto, primaria, texto, borda...). Mantenha em sincronia.
 */
const COR = {
  preto: "#0e0e10",
  primaria: "#c8102e",
  texto: "#111827",
  secundario: "#4b5563",
  borda: "#d1d5db",
  fundo: "#f3f4f6",
  perigo: "#b91c1c",
  alerta: "#b45309",
  sucesso: "#15803d",
};

const estilos = StyleSheet.create({
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
  numeroRotulo: { fontSize: 8.5, color: COR.secundario },
  numero: { fontSize: 16, fontFamily: "Courier-Bold" },
  titulo: { marginTop: 14, fontSize: 15, fontFamily: "Helvetica-Bold" },
  grade: { flexDirection: "row", gap: 10, marginTop: 10 },
  caixa: { flex: 1, borderWidth: 1, borderColor: COR.borda, borderRadius: 4, padding: 8, gap: 2 },
  caixaTitulo: { fontSize: 8, color: COR.secundario, textTransform: "uppercase", marginBottom: 2 },
  forte: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  secao: { marginTop: 14, fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  linhaDiv: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COR.borda,
    gap: 8,
  },
  cabecalhoTabela: {
    flexDirection: "row",
    backgroundColor: COR.fundo,
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 8,
  },
  colGrupo: { width: "24%", color: COR.secundario },
  colItem: { flex: 1 },
  colEstado: { width: "16%", fontFamily: "Helvetica-Bold" },
  semDiv: { color: COR.sucesso, fontFamily: "Helvetica-Bold" },
  fotos: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  foto: { width: 118, height: 88, objectFit: "cover", borderRadius: 3 },
  termo: {
    marginTop: 14,
    padding: 8,
    backgroundColor: COR.fundo,
    borderRadius: 4,
    fontSize: 8.5,
    lineHeight: 1.4,
    color: COR.secundario,
  },
  assinaturaBox: { marginTop: 14, flexDirection: "row", gap: 16, alignItems: "flex-end" },
  assinaturaImg: {
    width: 170,
    height: 70,
    objectFit: "contain",
    borderBottomWidth: 1,
    borderBottomColor: COR.preto,
  },
  rodape: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7.5,
    color: COR.secundario,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const TERMO =
  "Declaro que entreguei o motor/componentes acima descritos para análise e serviço, conferidos na minha presença nas condições registradas neste comprovante. " +
  "O orçamento será informado após a desmontagem e a análise técnica, e nenhum serviço será executado sem a minha aprovação. " +
  "Itens não relacionados neste comprovante não serão considerados como entregues.";

export function ComprovantePdf({ dados }: { dados: DadosPdfComprovante }) {
  const { empresa, cliente } = dados;
  return (
    <Document title={`Comprovante de recebimento OS ${dados.numeroOs}`} author={empresa.nome}>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.topo}>
          {dados.logo && <Image src={{ data: dados.logo, format: "png" }} style={estilos.logo} />}
          <View style={estilos.empresa}>
            <Text style={estilos.empresaNome}>{empresa.nome}</Text>
            {empresa.razaoSocial && <Text style={estilos.pequeno}>{empresa.razaoSocial}</Text>}
            {empresa.cnpj && <Text style={estilos.pequeno}>CNPJ {empresa.cnpj}</Text>}
            {empresa.endereco && <Text style={estilos.pequeno}>{empresa.endereco}</Text>}
            <Text style={estilos.pequeno}>
              {[empresa.telefone, empresa.email].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
          <View style={estilos.numeroBox}>
            <Text style={estilos.numeroRotulo}>Ordem de serviço</Text>
            <Text style={estilos.numero}>{dados.numeroOs}</Text>
            <Text style={estilos.pequeno}>{dados.recebidoEm}</Text>
          </View>
        </View>

        <Text style={estilos.titulo}>Comprovante de recebimento</Text>

        <View style={estilos.grade}>
          <View style={estilos.caixa}>
            <Text style={estilos.caixaTitulo}>Cliente</Text>
            <Text style={estilos.forte}>{cliente.nome}</Text>
            <Text style={estilos.pequeno}>{cliente.tipo}</Text>
            <Text style={estilos.pequeno}>Tel.: {cliente.telefone}</Text>
            <Text style={estilos.pequeno}>Documento: {cliente.documento}</Text>
            {dados.carro && (
              <Text style={estilos.pequeno}>
                Carro do cliente:{" "}
                {[dados.carro.nome, dados.carro.placa, dados.carro.telefone]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
          </View>
          <View style={estilos.caixa}>
            <Text style={estilos.caixaTitulo}>Motor</Text>
            <Text style={estilos.forte}>{dados.motor}</Text>
            {dados.motorDetalhes.map((l) => (
              <Text key={l} style={estilos.pequeno}>
                {l}
              </Text>
            ))}
            {dados.prazo && <Text style={estilos.pequeno}>Prazo prometido: {dados.prazo}</Text>}
            {dados.recebidoPor && (
              <Text style={estilos.pequeno}>Recebido por: {dados.recebidoPor}</Text>
            )}
          </View>
        </View>

        <Text style={estilos.secao}>Divergências na conferência</Text>
        {dados.divergencias.length === 0 ? (
          <Text style={estilos.semDiv}>
            Nenhuma divergência: todos os itens conferidos estão OK.
          </Text>
        ) : (
          <View>
            <View style={estilos.cabecalhoTabela}>
              <Text style={[estilos.colGrupo, { fontFamily: "Helvetica-Bold" }]}>Grupo</Text>
              <Text style={[estilos.colItem, { fontFamily: "Helvetica-Bold" }]}>Item</Text>
              <Text style={[estilos.colEstado, { color: COR.texto }]}>Estado</Text>
            </View>
            {dados.divergencias.map((d, i) => (
              <View key={`${d.grupo}-${d.descricao}-${i}`} style={estilos.linhaDiv} wrap={false}>
                <Text style={estilos.colGrupo}>{d.grupo}</Text>
                <View style={estilos.colItem}>
                  <Text>{d.descricao}</Text>
                  {d.observacao && <Text style={estilos.pequeno}>{d.observacao}</Text>}
                </View>
                <Text
                  style={[
                    estilos.colEstado,
                    { color: d.status === "Danificado" ? COR.perigo : COR.alerta },
                  ]}
                >
                  {d.status}
                </Text>
              </View>
            ))}
          </View>
        )}
        {dados.gruposNa.length > 0 && (
          <Text style={[estilos.pequeno, { marginTop: 4 }]}>
            Não veio com: {dados.gruposNa.join(", ")} (N/A).
          </Text>
        )}
        {dados.observacoes && (
          <Text style={[estilos.pequeno, { marginTop: 6 }]}>Observações: {dados.observacoes}</Text>
        )}

        {dados.miniaturas.length > 0 && (
          <View wrap={false}>
            <Text style={estilos.secao}>Fotos do recebimento</Text>
            <View style={estilos.fotos}>
              {dados.miniaturas.map((m, i) => (
                <Image key={i} src={{ data: m, format: "jpg" }} style={estilos.foto} />
              ))}
            </View>
          </View>
        )}

        <Text style={estilos.termo}>{TERMO}</Text>

        <View style={estilos.assinaturaBox} wrap={false}>
          <View>
            {dados.assinatura ? (
              <Image
                src={{ data: dados.assinatura, format: "png" }}
                style={estilos.assinaturaImg}
              />
            ) : (
              <View style={[estilos.assinaturaImg, { height: 50 }]} />
            )}
            {dados.assinante ? (
              <>
                <Text style={[estilos.forte, { marginTop: 3 }]}>{dados.assinante.nome}</Text>
                <Text style={estilos.pequeno}>Documento: {dados.assinante.documento}</Text>
                <Text style={estilos.pequeno}>Assinado em {dados.assinante.quando}</Text>
              </>
            ) : (
              <Text style={estilos.pequeno}>Assinatura pendente</Text>
            )}
          </View>
        </View>

        <View style={estilos.rodape} fixed>
          <Text>
            {empresa.nome} · OS {dados.numeroOs}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
