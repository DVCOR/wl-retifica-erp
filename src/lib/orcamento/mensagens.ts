import { formatarMoeda } from "@/lib/format";

/** Texto pronto do WhatsApp com o link público do orçamento. */
export function montarMensagemOrcamento(dados: {
  nomeCliente: string;
  numeroOs: string;
  empresa: string;
  total: number | null;
  validade: string | null; // yyyy-mm-dd
  link: string;
}): string {
  const partes = [
    `Olá, ${dados.nomeCliente}! O orçamento da OS ${dados.numeroOs} na ${dados.empresa} está pronto.`,
  ];
  if (dados.total !== null) partes.push(`Total: ${formatarMoeda(dados.total)}.`);
  if (dados.validade) {
    const [a, m, d] = dados.validade.split("-");
    partes.push(`Válido até ${d}/${m}/${a}.`);
  }
  partes.push(`Veja o laudo, as fotos e aprove por aqui: ${dados.link}`);
  return partes.join("\n");
}

export function linkPublicoOs(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/$/, "")}/os-publica/${token}`;
}
