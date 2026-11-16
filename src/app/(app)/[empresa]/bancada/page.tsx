import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { EmConstrucao } from "@/components/app/em-construcao";
import { SemAcesso } from "@/components/app/sem-acesso";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";

export const metadata: Metadata = { title: "Minha bancada" };

export default async function Pagina({ params }: PageProps<"/[empresa]/bancada">) {
  const { empresa: slug } = await params;
  const { membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "bancada.acessar")) return <SemAcesso slug={slug} />;
  return (
    <>
      <PageHeader
        titulo="Minha bancada"
        descricao="Suas OS atribuídas: medições, apontamentos e status."
      />
      <EmConstrucao modulo="A bancada do técnico" />
    </>
  );
}
