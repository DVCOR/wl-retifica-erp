import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaPublica } from "@/components/orcamento/publica/pagina-publica";
import { obterFotosPublicas, obterOsPublica, tokenValido } from "@/lib/data/orcamento-publico";

export const metadata: Metadata = {
  title: "Acompanhe sua OS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

/**
 * Página pública da OS (sem login): andamento, laudo resumido, orçamento e
 * aprovação. Só mostra o que `os_publica(token)` devolve.
 */
export default async function OsPublicaPage({ params }: PageProps<"/os-publica/[token]">) {
  const { token } = await params;
  if (!tokenValido(token)) notFound();
  const dados = await obterOsPublica(token);
  if (!dados) notFound();
  const fotos = await obterFotosPublicas(token);
  return <PaginaPublica token={token} dados={dados} fotos={fotos} />;
}
