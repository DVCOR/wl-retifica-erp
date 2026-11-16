import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { VisaoBalcao, VisaoDono, VisaoFinanceiro, VisaoTecnico } from "@/components/inicio/visoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { podeVerPrecos, type Papel } from "@/lib/auth/permissoes";
import {
  carregarInicioBalcao,
  carregarInicioDono,
  carregarInicioFinanceiro,
  carregarInicioTecnico,
} from "@/lib/data/inicio";

export const metadata: Metadata = { title: "Início" };

const DESCRICAO_POR_PAPEL: Record<Papel, string> = {
  dono: "Painel da retífica: OS por status, atrasadas, entregues e valor aprovado no mês.",
  balcao: "Abra uma OS e acompanhe a fila do dia.",
  tecnico: "Suas OS atribuídas e o que fazer agora.",
  financeiro: "Resumo do mês enquanto o financeiro não chega.",
};

export default async function InicioPage({ params }: PageProps<"/[empresa]/inicio">) {
  const { empresa: slug } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  const primeiroNome = membro.nome.split(" ")[0];

  let conteudo: React.ReactNode;
  switch (membro.papel) {
    case "balcao":
      conteudo = <VisaoBalcao slug={slug} d={await carregarInicioBalcao(empresa.id)} />;
      break;
    case "tecnico":
      conteudo = (
        <VisaoTecnico slug={slug} d={await carregarInicioTecnico(empresa.id, membro.id)} />
      );
      break;
    case "financeiro":
      conteudo = (
        <VisaoFinanceiro
          d={await carregarInicioFinanceiro(
            empresa.id,
            podeVerPrecos(membro.papel, empresa.config),
          )}
        />
      );
      break;
    default:
      conteudo = <VisaoDono slug={slug} d={await carregarInicioDono(empresa.id)} />;
  }

  return (
    <>
      <PageHeader
        titulo={`Olá, ${primeiroNome}`}
        descricao={DESCRICAO_POR_PAPEL[membro.papel]}
        acoes={
          membro.papel === "dono" && (
            <>
              <Button asChild size="lg">
                <Link href={`/${slug}/os/nova`}>
                  <Plus strokeWidth={2.5} aria-hidden />
                  Nova OS
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={`/${slug}/bancada`}>
                  <Wrench aria-hidden />
                  Minha bancada
                </Link>
              </Button>
            </>
          )
        }
      />
      {conteudo}
    </>
  );
}
