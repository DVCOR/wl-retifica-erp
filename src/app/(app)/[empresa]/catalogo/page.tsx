import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { EmConstrucao } from "@/components/app/em-construcao";
import { SemAcesso } from "@/components/app/sem-acesso";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";

export const metadata: Metadata = { title: "Catálogo e preços" };

export default async function Pagina({ params }: PageProps<"/[empresa]/catalogo">) {
  const { empresa: slug } = await params;
  const { membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "catalogo.ver")) return <SemAcesso slug={slug} />;
  return (
    <>
      <PageHeader
        titulo="Catálogo e preços"
        descricao="Serviços, peças, tabelas de preço e kits."
      />
      <EmConstrucao modulo="O catálogo" />
    </>
  );
}
