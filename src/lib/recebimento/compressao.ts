/** Compressão de fotos no cliente antes do upload. */

export const LADO_MAXIMO_PADRAO = 1600;
export const QUALIDADE_JPEG_PADRAO = 0.8;

/** Reduz mantendo proporção; nunca amplia. */
export function calcularDimensoes(
  largura: number,
  altura: number,
  ladoMaximo: number = LADO_MAXIMO_PADRAO,
): { largura: number; altura: number } {
  if (!(largura > 0) || !(altura > 0)) return { largura: 0, altura: 0 };
  const maior = Math.max(largura, altura);
  if (maior <= ladoMaximo) return { largura: Math.round(largura), altura: Math.round(altura) };
  const fator = ladoMaximo / maior;
  return {
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
  };
}

export type OpcoesCompressao = { ladoMaximo?: number; qualidade?: number };

/**
 * Converte qualquer imagem do aparelho (inclusive HEIC onde o navegador decodifica)
 * em JPEG reduzido. Só roda no navegador.
 */
export async function comprimirImagem(arquivo: Blob, opcoes: OpcoesCompressao = {}): Promise<Blob> {
  const { ladoMaximo = LADO_MAXIMO_PADRAO, qualidade = QUALIDADE_JPEG_PADRAO } = opcoes;
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  try {
    const { largura, altura } = calcularDimensoes(bitmap.width, bitmap.height, ladoMaximo);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem neste aparelho.");
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao comprimir a foto."))),
        "image/jpeg",
        qualidade,
      );
    });
  } finally {
    bitmap.close();
  }
}
