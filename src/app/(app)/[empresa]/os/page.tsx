import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { EmConstrucao } from "@/components/app/em-construcao";
import { SemAcesso } from "@/components/app/sem-acesso";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";

export const metadata: Metadata = { title: "Quadro de OS" };

export default async function Pagina({ params }: PageProps<"/[empresa]/os">) {
  const { empresa: slug } = await params;
  const { membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "os.ver_quadro")) return <SemAcesso slug={slug} />;
  return (
    <>
      <PageHeader titulo="Quadro de OS" descricao="Arraste o cartão para avançar o status. O sistema confere se a etapa está completa." />
      <EmConstrucao modulo="O quadro de OS" />
    </>
  );
}
