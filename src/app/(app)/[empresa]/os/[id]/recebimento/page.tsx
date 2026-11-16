import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SemAcesso } from "@/components/app/sem-acesso";
import { RecebimentoWizard } from "@/components/recebimento/recebimento-wizard";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { obterOsRecebimento } from "@/lib/data/recebimento";
import { FOTOS_GERAIS_MINIMO } from "@/lib/validacoes/recebimento";

export const metadata: Metadata = { title: "Recebimento da OS" };

export default async function RecebimentoPage({
  params,
}: PageProps<"/[empresa]/os/[id]/recebimento">) {
  const { empresa: slug, id } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "os.abrir")) return <SemAcesso slug={slug} />;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const os = await obterOsRecebimento(empresa.id, id);
  if (!os) notFound();

  const geraisGravadas = os.fotos.filter((f) => f.checklist_item_id === null).length;
  const etapaInicial =
    os.status !== "em_recebimento"
      ? "comprovante"
      : !os.checklist_concluido_em
        ? "checklist"
        : geraisGravadas < FOTOS_GERAIS_MINIMO
          ? "fotos"
          : "assinatura";

  return (
    <RecebimentoWizard
      slug={slug}
      empresaId={empresa.id}
      nomeEmpresa={empresa.nome_fantasia}
      os={os}
      etapaInicial={etapaInicial}
    />
  );
}
