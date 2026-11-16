import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { EmConstrucao } from "@/components/app/em-construcao";
import { SemAcesso } from "@/components/app/sem-acesso";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";

export const metadata: Metadata = { title: "Nova OS" };

export default async function Pagina({ params }: PageProps<"/[empresa]/os/nova">) {
  const { empresa: slug } = await params;
  const { membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "os.abrir")) return <SemAcesso slug={slug} />;
  return (
    <>
      <PageHeader titulo="Nova OS" descricao="Cliente, motor, checklist, fotos e assinatura." />
      <EmConstrucao modulo="O recebimento (Nova OS)" />
    </>
  );
}
