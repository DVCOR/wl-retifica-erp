import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, ROTULO_PAPEL } from "@/lib/auth/permissoes";
import { listarMembros, obterDadosEmpresa } from "@/lib/data/empresa";
import { formatarData } from "@/lib/format";
import { FormDadosEmpresa } from "./form-dados-empresa";

export const metadata: Metadata = { title: "Configurações" };

/**
 * Exemplo de referência do padrão de dados (src/lib/data/README.md):
 * Server Component -> obterContextoEmpresa -> funções de src/lib/data/empresa.ts.
 */
export default async function ConfiguracoesPage({ params }: PageProps<"/[empresa]/configuracoes">) {
  const { empresa: slug } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "configuracoes.gerenciar")) return <SemAcesso slug={slug} />;

  const [dados, membros] = await Promise.all([obterDadosEmpresa(empresa.id), listarMembros(empresa.id)]);

  return (
    <>
      <PageHeader titulo="Configurações" descricao="Dados da empresa, usuários e papéis." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Empresa</CardTitle>
            <CardDescription>Aparece nos comprovantes e no link enviado ao cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            {dados && (
              <FormDadosEmpresa
                inicial={{
                  nome_fantasia: dados.nome_fantasia,
                  razao_social: dados.razao_social,
                  telefone: dados.telefone,
                  email: dados.email,
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>Convites e edição de papéis chegam em breve.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-2">
            {membros.length === 0 ? (
              <EmptyState icone={<Users aria-hidden />} titulo="Nenhum usuário" className="mx-5" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="hidden sm:table-cell">Desconto máx.</TableHead>
                    <TableHead className="hidden md:table-cell">Desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membros.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.nome}
                        {m.id === membro.id && <span className="ml-1 text-texto-secundario">(você)</span>}
                        {!m.ativo && (
                          <Badge variant="contorno" className="ml-2">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.papel === "dono" ? "primaria" : "neutro"}>{ROTULO_PAPEL[m.papel]}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{m.limite_desconto_pct}%</TableCell>
                      <TableCell className="hidden md:table-cell">{formatarData(m.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
