export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type DadosEtiqueta = {
  numeroOs: string;
  cliente: string;
  empresa: string;
  /** data:image/png;base64,... com o QR que aponta para /[empresa]/os/[id]. */
  qrDataUrl: string;
  imprimirAoAbrir?: boolean;
};

/**
 * HTML autônomo da etiqueta 60×40 mm (impressora térmica ou comum). Na tela
 * mostra uma prévia com botão Imprimir; no papel, só a etiqueta.
 * Não usa o tema do app: etiqueta é sempre preto no branco.
 */
export function gerarHtmlEtiqueta(d: DadosEtiqueta): string {
  const numero = escaparHtml(d.numeroOs);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Etiqueta OS ${numero}</title>
<style>
  @page { size: 60mm 40mm; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: black; background: white; }
  .etiqueta { width: 60mm; height: 40mm; padding: 2.5mm; display: flex; align-items: center; gap: 2.5mm; overflow: hidden; background: white; }
  .qr { width: 30mm; height: 30mm; flex: none; image-rendering: pixelated; }
  .texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1mm; }
  .rotulo { font-size: 6pt; text-transform: uppercase; letter-spacing: .05em; }
  .numero { font-family: "Courier New", monospace; font-weight: 700; font-size: 11pt; line-height: 1.05; word-break: break-all; }
  .cliente { font-size: 8pt; font-weight: 700; line-height: 1.15; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
  .empresa { font-size: 5.5pt; margin-top: auto; }
  .acoes { display: none; }
  @media screen {
    body { background: lightgray; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
    .etiqueta { border: 1px solid gray; box-shadow: 0 2px 8px rgba(0,0,0,.25); transform: scale(2); margin: 40mm 0; }
    .acoes { display: flex; gap: 12px; }
    .acoes button { height: 48px; padding: 0 24px; font-size: 16px; font-weight: 700; border: 0; border-radius: 10px; background: black; color: white; cursor: pointer; }
  }
</style>
</head>
<body>
<div class="etiqueta">
  <img class="qr" src="${d.qrDataUrl}" alt="QR da OS ${numero}">
  <div class="texto">
    <span class="rotulo">Ordem de serviço</span>
    <span class="numero">${numero}</span>
    <span class="cliente">${escaparHtml(d.cliente)}</span>
    <span class="empresa">${escaparHtml(d.empresa)}</span>
  </div>
</div>
<div class="acoes"><button type="button" onclick="window.print()">Imprimir etiqueta</button></div>
${d.imprimirAoAbrir ? '<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 300); });</script>' : ""}
</body>
</html>`;
}
