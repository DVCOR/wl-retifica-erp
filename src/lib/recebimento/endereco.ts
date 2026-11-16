/** Endereço da empresa (jsonb) em uma linha: "R. X, 254 - Bairro - Cidade/UF". */
export function formatarEnderecoEmpresa(
  endereco: Record<string, string | undefined> | null,
): string {
  const e = endereco ?? {};
  const rua = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const cidadeUf = [e.cidade, e.uf].filter(Boolean).join("/");
  return [rua, e.bairro, cidadeUf].filter(Boolean).join(" - ");
}
