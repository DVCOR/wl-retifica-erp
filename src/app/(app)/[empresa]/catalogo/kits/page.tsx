import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { AbasCatalogo } from "@/components/catalogo/abas-catalogo";
import { KitsLista } from "@/components/catalogo/kits-lista";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, podeVerPrecos } from "@/lib/auth/permissoes";
import { escolherTabelaEstimativa, listarKits, listarTabelasResumo } from "@/lib/data/catalogo";

export const metadata: Metadata = { title: "Kits · Catálogo" };

export default async function Pagina({
  params,
  searchParams,
}: PageProps<"/[empresa]/catalogo/kits">) {
  const { empresa: slug } = await params;
  const { tabela: tabelaParam } = await searchParams;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "catalogo.ver")) return <SemAcesso slug={slug} />;

  const vePrecos = podeVerPrecos(membro.papel, empresa.config);
  const tabelas = vePrecos ? (await listarTabelasResumo(empresa.id)).filter((t) => t.ativo) : [];
  const escolhida =
    tabelas.find((t) => t.id === (typeof tabelaParam === "string" ? tabelaParam : undefined)) ??
    escolherTabelaEstimativa(tabelas);
  const kits = await listarKits(empresa.id, { vePrecos, tabelaId: escolhida?.id ?? null });

  return (
    <>
      <PageHeader
        titulo="Catálogo e preços"
        descricao="Serviços, peças, tabelas de preço e kits."
      />
      <AbasCatalogo />
      <KitsLista
        kits={kits}
        tabelas={tabelas.map((t) => ({ id: t.id, nome: t.nome }))}
        tabelaId={escolhida?.id ?? null}
      />
    </>
  );
}
