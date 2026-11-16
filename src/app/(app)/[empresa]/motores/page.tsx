import type { Metadata } from "next";
import Link from "next/link";
import { Cog, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
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
import { Paginacao } from "@/components/clientes/paginacao";
import { montarHref } from "@/components/clientes/url";
import { MotorSheet } from "@/components/motores/motor-sheet";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { listarMotores, POR_PAGINA_MOTORES, type MotorLinha } from "@/lib/data/motores";
import { formatarPlaca } from "@/lib/format";
import { descricaoMotor, filtroMotoresSchema, ROTULO_COMBUSTIVEL } from "@/lib/validacoes/motores";

export const metadata: Metadata = { title: "Motores" };

export default async function MotoresPage({
  params,
  searchParams,
}: PageProps<"/[empresa]/motores">) {
  const { empresa: slug } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "motores.ver")) return <SemAcesso slug={slug} />;

  const filtro = filtroMotoresSchema.parse(await searchParams);
  const { itens, total } = await listarMotores(empresa.id, filtro);
  const base = `/${slug}/motores`;
  const podeEditar = pode(membro.papel, "motores.editar");

  const novo = (
    <MotorSheet>
      <Button>
        <Plus aria-hidden /> Novo motor
      </Button>
    </MotorSheet>
  );

  return (
    <>
      <PageHeader
        titulo="Motores"
        descricao="Histórico por motor (código, nº de série) e placa."
        acoes={podeEditar ? novo : undefined}
      />

      <BuscaUrl
        className="mb-4"
        placeholder="Buscar por marca, modelo, código, nº de série ou placa"
        rotulo="Buscar motores"
      />

      {itens.length === 0 ? (
        <EmptyState
          icone={<Cog aria-hidden />}
          titulo={filtro.q ? "Nenhum motor encontrado" : "Nenhum motor cadastrado"}
          descricao={
            filtro.q
              ? "Confira o código, o nº de série ou a placa digitados."
              : "Os motores são cadastrados aqui ou no recebimento de uma OS."
          }
          acoes={
            filtro.q ? (
              <Button variant="outline" asChild>
                <Link href={base}>Limpar busca</Link>
              </Button>
            ) : podeEditar ? (
              novo
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-borda bg-superficie md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motor</TableHead>
                  <TableHead>Código / série</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Cliente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link
                        href={`${base}/${m.id}`}
                        className="inline-flex min-h-11 flex-col justify-center font-semibold hover:text-primaria"
                      >
                        {descricaoMotor(m)}
                        <span className="text-sm font-normal text-texto-secundario">
                          {detalhesTecnicos(m)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-[13px]">
                      {[m.codigo_motor, m.numero_serie].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell>
                      {m.veiculo_placa || m.veiculo_modelo ? (
                        <>
                          <span className="font-mono text-[13px]">
                            {formatarPlaca(m.veiculo_placa)}
                          </span>
                          {m.veiculo_modelo && (
                            <span className="block text-sm text-texto-secundario">
                              {m.veiculo_modelo}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {m.cliente ? (
                        pode(membro.papel, "clientes.ver") ? (
                          <Link
                            href={`/${slug}/clientes/${m.cliente.id}`}
                            className="hover:underline"
                          >
                            {m.cliente.nome}
                          </Link>
                        ) : (
                          m.cliente.nome
                        )
                      ) : (
                        <span className="text-texto-secundario">Sem cliente</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="grid gap-2.5 md:hidden" aria-label="Motores">
            {itens.map((m) => (
              <li key={m.id}>
                <Link
                  href={`${base}/${m.id}`}
                  className="flex min-h-16 flex-col gap-1 rounded-xl border border-borda bg-superficie p-4 active:bg-fundo"
                >
                  <span className="font-semibold">{descricaoMotor(m)}</span>
                  <span className="text-sm text-texto-secundario">
                    {[m.numero_serie && `Série ${m.numero_serie}`, detalhesTecnicos(m)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="flex flex-wrap gap-x-3 text-sm text-texto-secundario">
                    {m.veiculo_placa && (
                      <span className="font-mono">{formatarPlaca(m.veiculo_placa)}</span>
                    )}
                    <span>{m.cliente?.nome ?? "Sem cliente"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Paginacao
            className="mt-4"
            pagina={filtro.pagina}
            porPagina={POR_PAGINA_MOTORES}
            total={total}
            href={(p) => montarHref(base, { q: filtro.q, pagina: p })}
          />
        </>
      )}
    </>
  );
}

function detalhesTecnicos(m: MotorLinha): string {
  return [
    m.combustivel && ROTULO_COMBUSTIVEL[m.combustivel],
    m.cilindros && `${m.cilindros} cil.`,
    m.valvulas_por_cilindro && m.cilindros && `${m.cilindros * m.valvulas_por_cilindro}v`,
    m.cilindrada,
  ]
    .filter(Boolean)
    .join(" · ");
}
