/** Texto e link do WhatsApp (wa.me, sem API paga). */

/** Só dígitos; assume Brasil (55) quando vier DDD + número. Null se inválido. */
export function normalizarTelefoneWhatsapp(telefone: string | null | undefined): string | null {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return null;
}

export function montarMensagemRecebimento(dados: {
  nomeCliente: string;
  numeroOs: string;
  empresa: string;
  qtdDivergencias: number;
  linkOs: string;
}): string {
  const diverg =
    dados.qtdDivergencias === 0
      ? "Conferência sem divergências."
      : dados.qtdDivergencias === 1
        ? "Foi registrada 1 divergência na conferência."
        : `Foram registradas ${dados.qtdDivergencias} divergências na conferência.`;
  return [
    `Olá, ${dados.nomeCliente}! Recebemos o seu motor na ${dados.empresa}.`,
    `OS ${dados.numeroOs}. ${diverg}`,
    `Acompanhe pelo link: ${dados.linkOs}`,
  ].join("\n");
}

export function linkWhatsapp(telefone: string | null | undefined, mensagem: string): string {
  const numero = normalizarTelefoneWhatsapp(telefone);
  const base = numero ? `https://wa.me/${numero}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(mensagem)}`;
}
