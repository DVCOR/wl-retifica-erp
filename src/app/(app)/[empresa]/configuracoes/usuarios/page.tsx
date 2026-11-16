import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { listarMembros, listarMembrosComAcesso, type MembroComAcesso } from "@/lib/data/empresa";
import { modoLocal } from "@/lib/modo";
import { PainelUsuarios } from "./painel-usuarios";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage({
  params,
}: PageProps<"/[empresa]/configuracoes/usuarios">) {
  const { empresa: slug } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "usuarios.gerenciar")) return <SemAcesso slug={slug} />;

  const local = modoLocal();
  const membros: MembroComAcesso[] = local
    ? await listarMembrosComAcesso(empresa.id)
    : (await listarMembros(empresa.id)).map((m) => ({ ...m, user_id: "", acesso: "" }));

  return (
    <>
      <PageHeader
        voltar={{ href: `/${slug}/configuracoes`, rotulo: "Configurações" }}
        titulo="Usuários"
        descricao={
          local
            ? "Crie os acessos da oficina, redefina senhas e defina o papel de cada pessoa."
            : "Papéis e acesso das pessoas da empresa."
        }
      />
      <PainelUsuarios
        slug={slug}
        local={local}
        meuId={membro.id}
        membros={membros.map((m) => ({
          id: m.id,
          nome: m.nome,
          acesso: m.acesso,
          papel: m.papel,
          ativo: m.ativo,
        }))}
      />
    </>
  );
}
