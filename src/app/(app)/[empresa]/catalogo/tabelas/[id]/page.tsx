import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { GradePrecos } from "@/components/catalogo/grade-precos";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, podeVerPrecos } from "@/lib/auth/permissoes";
import { listarLinhasPrecoTabela, obterTabelaPreco } from "@/lib/data/catalogo";

export const metadata: Metadata = { title: "Tabela de preço · Catálogo" };

export default async function Pagina({ params }: PageProps<"/[empresa]/catalogo/tabelas/[id]">) {
  const { empresa: slug, id } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "catalogo.ver") || !podeVerPrecos(membro.papel, empresa.config)) {
    return <SemAcesso slug={slug} />;
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) notFound();
  const tabela = await obterTabelaPreco(empresa.id, id);
  if (!tabela) notFound();
  const linhas = await listarLinhasPrecoTabela(empresa.id, id);
  return (
    <>
      <PageHeader
        voltar={{ href: `/${slug}/catalogo/tabelas`, rotulo: "Tabelas de preço" }}
        titulo={tabela.nome}
        descricao={tabela.ativo ? "Preços específicos desta tabela." : "Tabela inativa."}
      />
      <GradePrecos tabela={tabela} linhas={linhas} />
    </>
  );
}
