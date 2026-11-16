import type { DadosComprovante } from "@/lib/data/recebimento";
import {
  formatarData,
  formatarDataHora,
  formatarDocumento,
  formatarPlaca,
  formatarTelefone,
} from "@/lib/format";
import { formatarEnderecoEmpresa } from "./endereco";
import { agruparPorGrupo, descreverItem, listarDivergencias, ROTULO_STATUS } from "./divergencias";
import { rotuloMotor } from "./rotulos";

/** Tudo já formatado em texto: o PDF só desenha. */
export type DadosPdfComprovante = {
  empresa: {
    nome: string;
    razaoSocial: string | null;
    cnpj: string | null;
    telefone: string | null;
    email: string | null;
    endereco: string;
  };
  numeroOs: string;
  recebidoEm: string;
  recebidoPor: string | null;
  prazo: string | null;
  observacoes: string | null;
  cliente: { nome: string; tipo: string; telefone: string; documento: string };
  motor: string;
  motorDetalhes: string[];
  carro: { nome: string | null; placa: string | null; telefone: string | null } | null;
  divergencias: { grupo: string; descricao: string; status: string; observacao: string | null }[];
  gruposNa: string[];
  assinante: { nome: string; documento: string; quando: string } | null;
  logo: Buffer | null;
  miniaturas: Buffer[];
  assinatura: Buffer | null;
};

export function montarDadosPdf(d: DadosComprovante, logo: Buffer | null): DadosPdfComprovante {
  const { os, empresa } = d;
  const carro =
    os.cliente_final_nome || os.cliente_final_placa || os.cliente_final_telefone
      ? {
          nome: os.cliente_final_nome,
          placa: os.cliente_final_placa ? formatarPlaca(os.cliente_final_placa) : null,
          telefone: os.cliente_final_telefone ? formatarTelefone(os.cliente_final_telefone) : null,
        }
      : null;

  const motor = os.motor;
  const motorDetalhes = motor
    ? [
        motor.numero_serie ? `Série/gravação: ${motor.numero_serie}` : null,
        motor.combustivel ? `Combustível: ${motor.combustivel}` : null,
        motor.cilindros ? `${motor.cilindros} cilindros` : null,
        motor.veiculo_placa ? `Placa: ${formatarPlaca(motor.veiculo_placa)}` : null,
      ].filter((v): v is string => Boolean(v))
    : [];

  return {
    empresa: {
      nome: empresa.nome_fantasia,
      razaoSocial: empresa.razao_social,
      cnpj: empresa.cnpj ? formatarDocumento(empresa.cnpj) : null,
      telefone: empresa.telefone ? formatarTelefone(empresa.telefone) : null,
      email: empresa.email,
      endereco: formatarEnderecoEmpresa(empresa.endereco),
    },
    numeroOs: os.numero,
    recebidoEm: formatarDataHora(d.recebidoEm ?? os.assinatura?.created_at ?? null),
    recebidoPor: d.recebidoPor,
    prazo: os.prazo_prometido ? formatarData(os.prazo_prometido) : null,
    observacoes: os.observacoes,
    cliente: {
      nome: os.cliente.nome,
      tipo: os.cliente.tipo === "lojista" ? "Lojista" : "Cliente final",
      telefone: formatarTelefone(os.cliente.telefone_whatsapp),
      documento: formatarDocumento(os.cliente.documento),
    },
    motor: rotuloMotor(motor),
    motorDetalhes,
    carro,
    divergencias: listarDivergencias(os.itens).map((i) => ({
      grupo: i.grupo,
      descricao: descreverItem(i),
      status: ROTULO_STATUS[i.status],
      observacao: i.observacao,
    })),
    gruposNa: agruparPorGrupo(os.itens)
      .filter((g) => g.todoNa)
      .map((g) => g.nome),
    assinante: os.assinatura
      ? {
          nome: os.assinatura.nome,
          documento: formatarDocumento(os.assinatura.documento),
          quando: formatarDataHora(os.assinatura.created_at),
        }
      : null,
    logo,
    miniaturas: d.miniaturas,
    assinatura: d.assinaturaImagem,
  };
}
