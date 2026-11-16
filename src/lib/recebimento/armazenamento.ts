/**
 * Abstração do Storage de anexos. A fila de upload e a assinatura dependem só
 * desta interface (fácil de trocar por um fake nos testes).
 */
export const BUCKET_ANEXOS = "os-anexos";

export interface ArmazenamentoArquivos {
  /**
   * Envia o arquivo para o caminho. Deve ser idempotente: se o objeto já existe
   * (retentativa depois de um sucesso cuja resposta se perdeu), resolve normalmente.
   */
  enviar(caminho: string, arquivo: Blob, tipo: string): Promise<void>;
}

/** `{empresa_id}/{os_id}/{prefixo}-{id}.{ext}` — o check do banco exige o prefixo. */
export function montarCaminhoAnexo(
  empresaId: string,
  osId: string,
  opcoes: { prefixo?: string; id: string; extensao: "jpg" | "png" },
): string {
  const prefixo = opcoes.prefixo ? `${opcoes.prefixo}-` : "";
  return `${empresaId}/${osId}/${prefixo}${opcoes.id}.${opcoes.extensao}`;
}

export function caminhoPertenceAOs(caminho: string, empresaId: string, osId: string): boolean {
  return (
    caminho.startsWith(`${empresaId}/${osId}/`) &&
    !caminho.includes("..") &&
    !caminho.slice(`${empresaId}/${osId}/`.length).includes("/")
  );
}
