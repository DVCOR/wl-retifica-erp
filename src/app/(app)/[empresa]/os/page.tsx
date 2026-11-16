import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { QuadroOs } from "@/components/os/quadro-os";
import { Button } from "@/components/ui/button";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { listarCartoesQuadro, listarResponsaveis } from "@/lib/data/os";
import { hojeSaoPaulo } from "@/lib/os/quadro";

export const metadata: Metadata = { title: "Quadro de OS" };

export default async function Pagina({
  params,
  searchParams,
}: PageProps<"/[empresa]/os">) {
  const { empresa: slug } = await params;
  const sp = await searchParams;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "os.ver_quadro")) return <SemAcesso slug={slug} />;
  const encerradas = sp.encerradas === "1";
  const [cartoes, tecnicos] = await Promise.all([
    listarCartoesQuadro(empresa.id, { encerradas }),
    listarResponsaveis(empresa.id),
  ]);
  return (
    <>
      <PageHeader
        titulo={encerradas ? "OS encerradas" : "Quadro de OS"}
        descricao={
          encerradas
            ? "Entregues, reprovadas e canceladas."
            : "Arraste o cartão para avançar o status. O sistema confere se a etapa está completa."
        }
        acoes={
          pode(membro.papel, "os.abrir") ? (
            <Button asChild>
              <Link href={`/${slug}/os/nova`}>
                <Plus aria-hidden /> Nova OS
              </Link>
            </Button>
          ) : undefined
        }
      />
      <QuadroOs
        slug={slug}
        empresaId={empresa.id}
        papel={membro.papel}
        membroId={membro.id}
        cartoes={cartoes}
        tecnicos={tecnicos.map((t) => ({ id: t.id, nome: t.nome }))}
        hoje={hojeSaoPaulo()}
        modo={encerradas ? "encerradas" : "aberto"}
      />
    </>
  );
}
