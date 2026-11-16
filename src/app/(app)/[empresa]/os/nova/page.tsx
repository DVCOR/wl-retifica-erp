import type { Metadata } from "next";
import { z } from "zod";
import { SemAcesso } from "@/components/app/sem-acesso";
import { NovaOsWizard } from "@/components/recebimento/nova-os-wizard";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { obterClienteParaOs } from "@/lib/data/recebimento";

export const metadata: Metadata = { title: "Nova OS" };

export default async function Pagina({ params, searchParams }: PageProps<"/[empresa]/os/nova">) {
  const { empresa: slug } = await params;
  const { cliente: clienteParam } = await searchParams;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "os.abrir")) return <SemAcesso slug={slug} />;

  const id = z
    .string()
    .uuid()
    .safeParse(Array.isArray(clienteParam) ? clienteParam[0] : clienteParam);
  const clienteInicial = id.success ? await obterClienteParaOs(empresa.id, id.data) : null;

  return <NovaOsWizard slug={slug} clienteInicial={clienteInicial} />;
}
