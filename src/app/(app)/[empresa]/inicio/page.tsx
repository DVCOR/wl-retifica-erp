import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { EmConstrucao } from "@/components/app/em-construcao";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, type Papel } from "@/lib/auth/permissoes";

export const metadata: Metadata = { title: "Início" };

const DESCRICAO_POR_PAPEL: Record<Papel, string> = {
  dono: "Painel da retífica: OS por status, atrasadas, entregues e valor aprovado no mês.",
  balcao: "Abra uma OS e acompanhe a fila do dia.",
  tecnico: "Suas OS atribuídas e o que fazer agora.",
  financeiro: "Valores a receber e vencidos.",
};

export default async function InicioPage({ params }: PageProps<"/[empresa]/inicio">) {
  const { empresa: slug } = await params;
  const { membro } = await obterContextoEmpresa(slug);
  const primeiroNome = membro.nome.split(" ")[0];
  return (
    <>
      <PageHeader
        titulo={`Olá, ${primeiroNome}`}
        descricao={DESCRICAO_POR_PAPEL[membro.papel]}
        acoes={
          <>
            {pode(membro.papel, "os.abrir") && (
              <Button asChild size="lg">
                <Link href={`/${slug}/os/nova`}>
                  <Plus strokeWidth={2.5} aria-hidden />
                  Nova OS
                </Link>
              </Button>
            )}
            {pode(membro.papel, "bancada.acessar") && (
              <Button asChild size="lg" variant="secondary">
                <Link href={`/${slug}/bancada`}>
                  <Wrench aria-hidden />
                  Minha bancada
                </Link>
              </Button>
            )}
          </>
        }
      />
      <EmConstrucao modulo="A tela inicial por papel" />
    </>
  );
}
