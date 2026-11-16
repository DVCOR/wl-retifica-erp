export const ETAPAS = [
  { id: "cliente", rotulo: "Cliente" },
  { id: "motor", rotulo: "Motor" },
  { id: "checklist", rotulo: "Checklist" },
  { id: "fotos", rotulo: "Fotos" },
  { id: "assinatura", rotulo: "Assinatura" },
  { id: "comprovante", rotulo: "Comprovante" },
] as const;

export type EtapaId = (typeof ETAPAS)[number]["id"];

export function indiceEtapa(id: EtapaId): number {
  return ETAPAS.findIndex((e) => e.id === id);
}
