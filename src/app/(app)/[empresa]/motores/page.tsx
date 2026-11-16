import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { EmConstrucao } from "@/components/app/em-construcao";
import { SemAcesso } from "@/components/app/sem-acesso";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";

export const metadata: Metadata = { title: "Motores" };

export default async function Pagina({ params }: PageProps<"/[empresa]/motores">) {
  const { empresa: slug } = await params;
  const { membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "motores.ver")) return <SemAcesso slug={slug} />;
  return (
    <>
      <PageHeader titulo="Motores" descricao="Histórico por motor (código, nº de série) e placa." />
      <EmConstrucao modulo="A lista de motores" />
    </>
  );
}
