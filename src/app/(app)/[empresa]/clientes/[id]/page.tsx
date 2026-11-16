import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { EmConstrucao } from "@/components/app/em-construcao";
import { SemAcesso } from "@/components/app/sem-acesso";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClienteFichaPage({ params }: PageProps<"/[empresa]/clientes/[id]">) {
  const { empresa: slug, id } = await params;
  const { membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "clientes.ver")) return <SemAcesso slug={slug} />;
  if (!z.string().uuid().safeParse(id).success) notFound();
  return (
    <>
      <PageHeader
        voltar={{ href: `/${slug}/clientes`, rotulo: "Clientes" }}
        titulo="Ficha do cliente"
        descricao="Dados, motores vinculados e linha do tempo de todas as OS."
      />
      <EmConstrucao modulo="A ficha do cliente" />
    </>
  );
}
