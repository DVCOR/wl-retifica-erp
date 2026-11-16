import { formatarPlaca } from "@/lib/format";

type MotorRotulavel = {
  marca: string | null;
  modelo: string | null;
  codigo_motor: string | null;
  numero_serie?: string | null;
};

/** "VW EA111 1.6 8v" a partir dos campos do motor. */
export function rotuloMotor(motor: MotorRotulavel | null | undefined): string {
  if (!motor) return "Motor não informado";
  const base = [motor.marca, motor.modelo, motor.codigo_motor].filter(Boolean).join(" ");
  return base || (motor.numero_serie ? `Série ${motor.numero_serie}` : "Motor sem identificação");
}

export const ROTULO_TIPO_CLIENTE = { lojista: "lojista", final: "cliente final" } as const;

/** Linha de resumo da OS no cabeçalho do wizard. */
export function resumoOs(dados: {
  numero?: string;
  clienteNome: string;
  clienteTipo: "lojista" | "final";
  motor: MotorRotulavel | null;
  placaCarro?: string | null;
}): string {
  return [
    dados.numero ? `OS ${dados.numero}` : null,
    `${dados.clienteNome} (${ROTULO_TIPO_CLIENTE[dados.clienteTipo]})`,
    dados.motor ? rotuloMotor(dados.motor) : null,
    dados.placaCarro ? `carro do cliente ${formatarPlaca(dados.placaCarro)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
