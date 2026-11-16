import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BuscaUrl } from "@/components/clientes/busca-url";
import { ClienteSheet } from "@/components/clientes/cliente-sheet";
import { FiltroOpcoes } from "@/components/clientes/filtro-opcoes";
import { Paginacao } from "@/components/clientes/paginacao";
import { montarHref } from "@/components/clientes/url";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, podeVerPrecos } from "@/lib/auth/permissoes";
import {
  listarClientes,
  listarTabelasPreco,
  POR_PAGINA_CLIENTES,
  type ClienteLinha,
} from "@/lib/data/clientes";
import { formatarDocumento, formatarTelefone } from "@/lib/format";
import { filtroClientesSchema, ROTULO_TIPO_CLIENTE } from "@/lib/validacoes/clientes";

export const metadata: Metadata = { title: "Clientes" };

const PADROES = { tipo: "todos", situacao: "ativos", pagina: 1 };

export default async function ClientesPage({
  params,
  searchParams,
}: PageProps<"/[empresa]/clientes">) {
  const { empresa: slug } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "clientes.ver")) return <SemAcesso slug={slug} />;

  const filtro = filtroClientesSchema.parse(await searchParams);
  const base = `/${slug}/clientes`;
  const href = (extra: Record<string, string | number | null>) =>
    montarHref(
      base,
      { q: filtro.q, tipo: filtro.tipo, situacao: filtro.situacao, ...extra },
      PADROES,
    );

  const vePrecos = podeVerPrecos(membro.papel, empresa.config);
  const [{ itens, total }, tabelas] = await Promise.all([
    listarClientes(empresa.id, filtro),
    pode(membro.papel, "clientes.cadastrar") && vePrecos
      ? listarTabelasPreco(empresa.id)
      : Promise.resolve([]),
  ]);

  const podeCadastrar = pode(membro.papel, "clientes.cadastrar");
  const filtrando = !!filtro.q || filtro.tipo !== "todos" || filtro.situacao !== "ativos";

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descricao="Lojistas e clientes finais, com o histórico de serviços."
        acoes={
          podeCadastrar && (
            <ClienteSheet tabelas={tabelas}>
              <Button>
                <Plus aria-hidden /> Novo cliente
              </Button>
            </ClienteSheet>
          )
        }
      />

      <div className="mb-4 grid gap-3">
        <BuscaUrl
          placeholder="Buscar por nome, CPF/CNPJ, telefone ou placa"
          rotulo="Buscar clientes"
        />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <FiltroOpcoes
            rotulo="Tipo de cliente"
            atual={filtro.tipo}
            opcoes={[
              { valor: "todos", rotulo: "Todos", href: href({ tipo: "todos", pagina: null }) },
              {
                valor: "lojista",
                rotulo: "Lojistas",
                href: href({ tipo: "lojista", pagina: null }),
              },
              {
                valor: "final",
                rotulo: "Clientes finais",
                href: href({ tipo: "final", pagina: null }),
              },
            ]}
          />
          <FiltroOpcoes
            rotulo="Situação"
            atual={filtro.situacao}
            opcoes={[
              {
                valor: "ativos",
                rotulo: "Ativos",
                href: href({ situacao: "ativos", pagina: null }),
              },
              {
                valor: "inativos",
                rotulo: "Inativos",
                href: href({ situacao: "inativos", pagina: null }),
              },
              { valor: "todos", rotulo: "Todos", href: href({ situacao: "todos", pagina: null }) },
            ]}
          />
        </div>
      </div>

      {itens.length === 0 ? (
        <EmptyState
          icone={<Users aria-hidden />}
          titulo={filtrando ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          descricao={
            filtrando
              ? "Tente outro termo ou limpe os filtros."
              : "Cadastre o primeiro cliente para abrir ordens de serviço e ver o histórico."
          }
          acoes={
            filtrando ? (
              <Button variant="outline" asChild>
                <Link href={base}>Limpar filtros</Link>
              </Button>
            ) : podeCadastrar ? (
              <ClienteSheet tabelas={tabelas}>
                <Button>
                  <Plus aria-hidden /> Novo cliente
                </Button>
              </ClienteSheet>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-borda bg-superficie md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">OS em andamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`${base}/${c.id}`}
                        className="inline-flex min-h-11 flex-col justify-center font-semibold text-texto hover:text-primaria"
                      >
                        <span>
                          {c.nome}
                          {!c.ativo && (
                            <Badge variant="contorno" className="ml-2 align-middle">
                              Inativo
                            </Badge>
                          )}
                        </span>
                        {c.nome_fantasia && (
                          <span className="text-sm font-normal text-texto-secundario">
                            {c.nome_fantasia}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <BadgeTipo tipo={c.tipo} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatarDocumento(c.documento)}
                    </TableCell>
                    <TableCell>{formatarTelefone(c.telefone_whatsapp)}</TableCell>
                    <TableCell className="text-right font-medium">{c.os_em_andamento}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="grid gap-2.5 md:hidden" aria-label="Clientes">
            {itens.map((c) => (
              <li key={c.id}>
                <CartaoCliente cliente={c} href={`${base}/${c.id}`} />
              </li>
            ))}
          </ul>

          <Paginacao
            className="mt-4"
            pagina={filtro.pagina}
            porPagina={POR_PAGINA_CLIENTES}
            total={total}
            href={(p) => href({ pagina: p })}
          />
        </>
      )}
    </>
  );
}

function BadgeTipo({ tipo }: { tipo: ClienteLinha["tipo"] }) {
  return (
    <Badge variant={tipo === "lojista" ? "info" : "neutro"}>{ROTULO_TIPO_CLIENTE[tipo]}</Badge>
  );
}

function CartaoCliente({ cliente: c, href }: { cliente: ClienteLinha; href: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-16 flex-col gap-1.5 rounded-xl border border-borda bg-superficie p-4 active:bg-fundo"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 font-semibold text-texto">{c.nome}</span>
        <BadgeTipo tipo={c.tipo} />
      </span>
      {c.nome_fantasia && <span className="text-sm text-texto-secundario">{c.nome_fantasia}</span>}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-secundario">
        <span>{formatarTelefone(c.telefone_whatsapp)}</span>
        {c.documento && <span className="font-mono">{formatarDocumento(c.documento)}</span>}
      </span>
      <span className="flex items-center gap-2 text-sm">
        {c.os_em_andamento > 0 && (
          <Badge variant="primaria">{c.os_em_andamento} OS em andamento</Badge>
        )}
        {!c.ativo && <Badge variant="contorno">Inativo</Badge>}
      </span>
    </Link>
  );
}
