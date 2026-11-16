import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { LaudoMedicoes } from "@/components/orcamento/laudo-medicoes";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { listarMedicoes, obterOsOrcamento } from "@/lib/data/orcamento";
import { formatarNumeroOs } from "@/lib/format";
import { resumirMedicoes } from "@/lib/orcamento/medicao";

export const metadata: Metadata = { title: "Laudo e medições" };

export default async function LaudoPage({ params }: PageProps<"/[empresa]/os/[id]/laudo">) {
  const { empresa: slug, id } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const os = await obterOsOrcamento(empresa.id, id);
  if (!os) notFound();
  const medicoes = await listarMedicoes(empresa.id, id);
  const r = resumirMedicoes(medicoes);
  const numero = formatarNumeroOs(os.numero);
  const voltar =
    membro.papel === "tecnico"
      ? { href: `/${slug}/bancada`, rotulo: "Minha bancada" }
      : { href: `/${slug}/os/${id}`, rotulo: `OS ${numero}` };

  return (
    <>
      <PageHeader
        voltar={voltar}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            Laudo e medições <StatusBadge status={os.status} />
          </span>
        }
        descricao={`OS ${numero}${os.motor ? ` · ${[os.motor.marca, os.motor.modelo].filter(Boolean).join(" ")}` : ""}${
          r.total > 0 ? ` · ${r.naoConformes} não conforme(s) de ${r.total}` : ""
        }`}
      />
      <div className="mx-auto max-w-3xl">
        <LaudoMedicoes
          slug={slug}
          empresaId={empresa.id}
          osId={id}
          tabelaPrecoId={os.cliente.tabela_preco_id}
          podeRegistrar={pode(membro.papel, "laudo.registrar")}
          podeSugerir={pode(membro.papel, "orcamento.sugerir_itens")}
          medicoes={medicoes.map((m) => ({
            id: m.id,
            componente: m.componente,
            descricao: m.descricao,
            valor: m.valor === null ? null : Number(m.valor),
            valor_texto: m.valor_texto,
            unidade: m.unidade,
            minimo: m.minimo === null ? null : Number(m.minimo),
            maximo: m.maximo === null ? null : Number(m.maximo),
            conforme: m.conforme,
            observacao: m.observacao,
            membro_nome: m.membro_nome,
            fotos: m.fotos,
          }))}
        />
      </div>
    </>
  );
}
