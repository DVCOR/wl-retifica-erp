import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { z } from "zod";
import { EmConstrucao } from "@/components/app/em-construcao";

export const metadata: Metadata = { title: "Sua OS", robots: { index: false, follow: false } };

/**
 * Página pública da OS (sem login) — acompanhar e aprovar/reprovar orçamento.
 * Implementação: feat/orcamento. Dados: rpc("os_publica", { p_token }) com o
 * cliente servidor (anon); fotos: rpc("os_publica_fotos") com criarClienteAdmin()
 * + storage.createSignedUrls; resposta: rpc("responder_orcamento_publico").
 */
export default async function OsPublicaPage({ params }: PageProps<"/os-publica/[token]">) {
  const { token } = await params;
  if (!z.string().uuid().safeParse(token).success) notFound();
  return (
    <div className="min-h-dvh bg-fundo">
      <header className="flex h-16 items-center border-b-[3px] border-primaria bg-preto px-4">
        <Image
          src="/brand/wl-marca.png"
          alt="WL Retífica"
          width={600}
          height={221}
          className="h-10 w-auto rounded-md"
        />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <EmConstrucao
          modulo="Acompanhamento da OS"
          descricao="Aqui o cliente verá o status, o orçamento e poderá aprovar."
        />
      </main>
    </div>
  );
}
