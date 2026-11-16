import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { AbasCatalogo } from "@/components/catalogo/abas-catalogo";
import { ServicosLista } from "@/components/catalogo/servicos-lista";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, podeVerPrecos } from "@/lib/auth/permissoes";
import { listarServicos } from "@/lib/data/catalogo";

export const metadata: Metadata = { title: "Catálogo e preços" };

export default async function Pagina({ params }: PageProps<"/[empresa]/catalogo">) {
  const { empresa: slug } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "catalogo.ver")) return <SemAcesso slug={slug} />;
  const servicos = await listarServicos(empresa.id, podeVerPrecos(membro.papel, empresa.config));
  return (
    <>
      <PageHeader titulo="Catálogo e preços" descricao="Serviços, peças, tabelas de preço e kits." />
      <AbasCatalogo />
      <ServicosLista servicos={servicos} />
    </>
  );
}
