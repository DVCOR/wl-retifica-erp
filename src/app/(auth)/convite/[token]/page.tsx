import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { modoLocal } from "@/lib/modo";
import { Button } from "@/components/ui/button";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterUsuario } from "@/lib/auth/sessao";
import { ROTULO_PAPEL, type Papel } from "@/lib/auth/permissoes";
import { sair } from "@/lib/auth/actions";
import { AceitarConvite, EnviarLinkConvite } from "./convite-acoes";

export const metadata: Metadata = { title: "Convite" };

type InfoConvite = {
  empresa_nome: string;
  empresa_slug: string;
  email: string;
  nome: string | null;
  papel: Papel;
  expirado: boolean;
  aceito: boolean;
};

export default async function ConvitePage({ params }: PageProps<"/convite/[token]">) {
  // Modo local: usuários são criados pelo dono; não há convite por e-mail.
  if (modoLocal()) notFound();
  const { token } = await params;
  if (!z.string().uuid().safeParse(token).success) notFound();

  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("convite_info", { p_token: token });
  const info = data as InfoConvite | null;
  if (!info) notFound();

  const usuario = await obterUsuario();

  return (
    <>
      <h1 className="text-xl font-bold">Convite para {info.empresa_nome}</h1>
      <p className="mt-1 mb-5 text-[15px] text-texto-secundario">
        Você foi convidado como <strong className="text-texto">{ROTULO_PAPEL[info.papel]}</strong> (
        {info.email}).
      </p>

      {info.aceito ? (
        <div className="grid gap-3">
          <p className="text-[15px]">Este convite já foi usado.</p>
          <Button asChild size="lg">
            <Link href={`/${info.empresa_slug}/inicio`}>Ir para o sistema</Link>
          </Button>
        </div>
      ) : info.expirado ? (
        <p role="alert" className="rounded-lg bg-perigo-suave px-3 py-2.5 text-[15px] text-perigo">
          Este convite expirou. Peça um novo ao dono da retífica.
        </p>
      ) : !usuario ? (
        <div className="grid gap-4">
          <EnviarLinkConvite token={token} email={info.email} />
          <p className="text-center text-sm text-texto-secundario">
            Já tem senha?{" "}
            <Link
              className="font-semibold text-primaria hover:underline"
              href={`/login?proximo=/convite/${token}`}
            >
              Entrar
            </Link>
          </p>
        </div>
      ) : usuario.email?.toLowerCase() !== info.email ? (
        <div className="grid gap-3">
          <p
            role="alert"
            className="rounded-lg bg-alerta-suave px-3 py-2.5 text-[15px] text-alerta"
          >
            Você está conectado como {usuario.email}, mas o convite é para {info.email}.
          </p>
          <form action={sair}>
            <Button type="submit" variant="secondary" size="lg" className="w-full">
              Sair e entrar com outro e-mail
            </Button>
          </form>
        </div>
      ) : (
        <AceitarConvite token={token} nomeSugerido={info.nome} />
      )}
    </>
  );
}
