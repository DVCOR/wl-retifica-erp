import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { KitEditor } from "@/components/catalogo/kit-editor";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, podeVerPrecos } from "@/lib/auth/permissoes";
import { escolherTabelaEstimativa, listarKits, listarTabelasResumo } from "@/lib/data/catalogo";

export const metadata: Metadata = { title: "Kit · Catálogo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pagina({
  params,
  searchParams,
}: PageProps<"/[empresa]/catalogo/kits/[id]">) {
  const { empresa: slug, id } = await params;
  const { tabela: tabelaParam } = await searchParams;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "catalogo.ver")) return <SemAcesso slug={slug} />;
  const novo = id === "novo";
  if (novo && !pode(membro.papel, "catalogo.editar")) return <SemAcesso slug={slug} />;
  if (!novo && !UUID.test(id)) notFound();

  const vePrecos = podeVerPrecos(membro.papel, empresa.config);
  const tabelas = vePrecos ? (await listarTabelasResumo(empresa.id)).filter((t) => t.ativo) : [];
  const escolhida =
    tabelas.find((t) => t.id === (typeof tabelaParam === "string" ? tabelaParam : undefined)) ??
    escolherTabelaEstimativa(tabelas);

  let kit = null;
  if (!novo) {
    [kit = null] = await listarKits(empresa.id, {
      vePrecos,
      tabelaId: escolhida?.id ?? null,
      kitId: id,
    });
    if (!kit) notFound();
  }

  return (
    <>
      <PageHeader
        voltar={{ href: `/${slug}/catalogo/kits`, rotulo: "Kits" }}
        titulo={kit ? kit.nome : "Novo kit"}
        descricao={
          pode(membro.papel, "catalogo.editar")
            ? "Serviços e peças lançados juntos no orçamento."
            : "Itens que compõem o kit."
        }
      />
      <KitEditor
        key={kit?.id ?? "novo"}
        kit={kit}
        tabelaId={escolhida?.id ?? null}
        tabelaNome={escolhida?.nome ?? null}
      />
    </>
  );
}
