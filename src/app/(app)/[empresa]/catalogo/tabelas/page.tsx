import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { AbasCatalogo } from "@/components/catalogo/abas-catalogo";
import { TabelasLista } from "@/components/catalogo/tabelas-lista";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, podeVerPrecos } from "@/lib/auth/permissoes";
import { listarTabelasPreco } from "@/lib/data/catalogo";

export const metadata: Metadata = { title: "Tabelas de preço · Catálogo" };

export default async function Pagina({ params }: PageProps<"/[empresa]/catalogo/tabelas">) {
  const { empresa: slug } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "catalogo.ver") || !podeVerPrecos(membro.papel, empresa.config)) {
    return <SemAcesso slug={slug} />;
  }
  const tabelas = await listarTabelasPreco(empresa.id);
  return (
    <>
      <PageHeader
        titulo="Catálogo e preços"
        descricao="Serviços, peças, tabelas de preço e kits."
      />
      <AbasCatalogo />
      <TabelasLista tabelas={tabelas} />
    </>
  );
}
