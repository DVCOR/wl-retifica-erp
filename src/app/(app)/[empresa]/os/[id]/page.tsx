import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { EmConstrucao } from "@/components/app/em-construcao";
import { obterContextoEmpresa } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "OS" };

export default async function OsDetalhePage({ params }: PageProps<"/[empresa]/os/[id]">) {
  const { empresa: slug, id } = await params;
  await obterContextoEmpresa(slug);
  if (!z.string().uuid().safeParse(id).success) notFound();
  return (
    <>
      <PageHeader
        voltar={{ href: `/${slug}/os`, rotulo: "Quadro de OS" }}
        titulo="Detalhe da OS"
        descricao="Resumo · Checklist · Laudo · Orçamento · Execução · Anexos · Histórico"
      />
      <EmConstrucao modulo="O detalhe da OS" />
    </>
  );
}
