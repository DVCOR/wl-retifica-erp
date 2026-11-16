import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cog, MessageCircle, Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BotaoSituacaoCliente } from "@/components/clientes/acoes-cliente";
import { BuscaUrl } from "@/components/clientes/busca-url";
import { ClienteSheet } from "@/components/clientes/cliente-sheet";
import { FiltroSelectUrl } from "@/components/clientes/filtro-select-url";
import { Paginacao } from "@/components/clientes/paginacao";
import { TabelaOs } from "@/components/clientes/tabela-os";
import { montarHref } from "@/components/clientes/url";
import { MotorSheet } from "@/components/motores/motor-sheet";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, podeVerPrecos, type OsStatus } from "@/lib/auth/permissoes";
import {
  historicoOsCliente,
  listarTabelasPreco,
  obterCliente,
  POR_PAGINA_HISTORICO,
  resumoCliente,
} from "@/lib/data/clientes";
import { listarMotoresDoCliente } from "@/lib/data/motores";
import { formatarDocumento, formatarMoeda, formatarPlaca, formatarTelefone } from "@/lib/format";
import { STATUS_OS } from "@/lib/os/status";
import { cn, iniciais } from "@/lib/utils";
import { linkWhatsapp, ROTULO_TIPO_CLIENTE } from "@/lib/validacoes/clientes";
import { descricaoMotor, ROTULO_COMBUSTIVEL } from "@/lib/validacoes/motores";

export const metadata: Metadata = { title: "Cliente" };

const ABAS = [
  { valor: "historico", rotulo: "Histórico de OS" },
  { valor: "motores", rotulo: "Motores e veículos" },
  { valor: "financeiro", rotulo: "Financeiro" },
  { valor: "dados", rotulo: "Dados cadastrais" },
] as const;

const filtroSchema = z.object({
  aba: z
    .enum(["historico", "motores", "financeiro", "dados"])
    .catch("historico")
    .default("historico"),
  q: z.string().trim().max(80).catch("").default(""),
  status: z
    .enum(Object.keys(STATUS_OS).filter((s) => s !== "em_recebimento") as [OsStatus, ...OsStatus[]])
    .or(z.literal("todos"))
    .catch("todos")
    .default("todos"),
  pagina: z.coerce.number().int().min(1).catch(1).default(1),
});

const OPCOES_STATUS = [
  { valor: "todos", rotulo: "Status: todos" },
  ...(Object.entries(STATUS_OS) as [OsStatus, (typeof STATUS_OS)[OsStatus]][])
    .filter(([s]) => s !== "em_recebimento")
    .map(([valor, v]) => ({ valor, rotulo: v.rotulo })),
];

export default async function ClienteFichaPage({
  params,
  searchParams,
}: PageProps<"/[empresa]/clientes/[id]">) {
  const { empresa: slug, id } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "clientes.ver")) return <SemAcesso slug={slug} />;
  if (!z.uuid().safeParse(id).success) notFound();

  const filtro = filtroSchema.parse(await searchParams);
  const vePrecos = podeVerPrecos(membro.papel, empresa.config);

  const cliente = await obterCliente(empresa.id, id);
  if (!cliente) notFound();

  const podeEditar =
    pode(membro.papel, "clientes.editar") || pode(membro.papel, "clientes.editar_financeiro");
  const [resumo, tabelas] = await Promise.all([
    resumoCliente(empresa.id, id, vePrecos),
    vePrecos ? listarTabelasPreco(empresa.id) : Promise.resolve([]),
  ]);

  const base = `/${slug}/clientes/${id}`;
  const hrefAba = (aba: string) => montarHref(base, { aba }, { aba: "historico" });
  const tabelaPreco = tabelas.find((t) => t.id === cliente.tabela_preco_id);
  const whatsapp = linkWhatsapp(cliente.telefone_whatsapp);
  const lojista = cliente.tipo === "lojista";
  const limite = cliente.limite_credito === null ? null : Number(cliente.limite_credito);

  return (
    <>
      <PageHeader
        voltar={{ href: `/${slug}/clientes`, rotulo: "Clientes" }}
        titulo={cliente.nome}
      />

      <section className="mb-5 flex flex-wrap items-start justify-between gap-5 rounded-xl border border-borda bg-superficie p-5 md:p-6">
        <div className="flex min-w-0 flex-1 basis-96 items-start gap-4">
          <div
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-info-suave text-xl font-bold text-info md:size-16"
          >
            {iniciais(cliente.nome)}
          </div>
          <div className="grid min-w-0 gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={lojista ? "info" : "neutro"}>
                {ROTULO_TIPO_CLIENTE[cliente.tipo]}
              </Badge>
              {!cliente.ativo && <Badge variant="contorno">Inativo</Badge>}
              {cliente.nome_fantasia && (
                <span className="text-[15px] text-texto-secundario">{cliente.nome_fantasia}</span>
              )}
            </div>
            <p className="text-[15px] text-texto-secundario">
              {[
                cliente.documento && formatarDocumento(cliente.documento),
                cliente.telefone_whatsapp &&
                  `WhatsApp ${formatarTelefone(cliente.telefone_whatsapp)}`,
                cliente.email,
              ]
                .filter(Boolean)
                .join(" · ") || "Sem documento ou contato cadastrado"}
            </p>
            {vePrecos && (
              <p className="text-[15px] text-texto-secundario">
                Tabela de preço{" "}
                <strong className="text-texto">{tabelaPreco?.nome ?? "padrão do tipo"}</strong>
                {(cliente.condicao_pagamento || cliente.dia_fechamento) && (
                  <>
                    {" · "}Pagamento{" "}
                    <strong className="text-texto">
                      {[
                        cliente.condicao_pagamento,
                        cliente.dia_fechamento && `fechamento dia ${cliente.dia_fechamento}`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </strong>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {whatsapp && (
            <Button variant="outline" size="lg" asChild>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> WhatsApp
              </a>
            </Button>
          )}
          {pode(membro.papel, "os.abrir") && cliente.ativo && (
            <Button size="lg" asChild>
              <Link href={`/${slug}/os/nova?cliente=${cliente.id}`}>
                <Plus aria-hidden /> Nova OS para este cliente
              </Link>
            </Button>
          )}
          {podeEditar && (
            <ClienteSheet inicial={cliente} tabelas={tabelas}>
              <Button variant="outline" size="lg">
                <Pencil aria-hidden /> Editar
              </Button>
            </ClienteSheet>
          )}
          {pode(membro.papel, "clientes.editar") && (
            <BotaoSituacaoCliente id={cliente.id} nome={cliente.nome} ativo={cliente.ativo} />
          )}
        </div>
      </section>

      <section aria-label="Resumo" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="OS em andamento" valor={String(resumo.os_em_andamento)} />
        <Indicador rotulo="OS nos últimos 12 meses" valor={String(resumo.os_12_meses)} />
        {vePrecos && (
          <Indicador
            rotulo="Em aberto / limite"
            valor={formatarMoeda(resumo.em_aberto)}
            complemento={limite !== null ? `de ${formatarMoeda(limite)}` : "sem limite definido"}
            alerta={limite !== null && (resumo.em_aberto ?? 0) > limite}
          />
        )}
        <Indicador rotulo="Motores em garantia" valor={String(resumo.motores_em_garantia)} />
      </section>

      <section className="rounded-xl border border-borda bg-superficie">
        <nav
          aria-label="Seções do cliente"
          className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-borda px-2 md:px-4"
        >
          {ABAS.map((a) => {
            const ativa = a.valor === filtro.aba;
            return (
              <Link
                key={a.valor}
                href={hrefAba(a.valor)}
                scroll={false}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-12 shrink-0 items-center border-b-[3px] px-3.5 text-[15px] md:px-4",
                  ativa
                    ? "border-primaria font-semibold text-texto"
                    : "border-transparent font-medium text-texto-secundario hover:text-texto",
                )}
              >
                {a.rotulo}
              </Link>
            );
          })}
        </nav>

        {filtro.aba === "historico" && (
          <AbaHistorico
            slug={slug}
            empresaId={empresa.id}
            clienteId={id}
            vePrecos={vePrecos}
            filtro={filtro}
            base={base}
          />
        )}
        {filtro.aba === "motores" && (
          <AbaMotores
            slug={slug}
            empresaId={empresa.id}
            cliente={{ id: cliente.id, nome: cliente.nome }}
            podeEditar={pode(membro.papel, "motores.editar")}
          />
        )}
        {filtro.aba === "financeiro" && (
          <EmptyState
            titulo="Disponível na Fase 2"
            descricao="Títulos a receber, fechamentos e inadimplência deste cliente aparecem aqui quando o módulo financeiro for liberado."
            className="m-4"
          />
        )}
        {filtro.aba === "dados" && (
          <AbaDados cliente={cliente} vePrecos={vePrecos} tabelaNome={tabelaPreco?.nome ?? null} />
        )}
      </section>
    </>
  );
}

function Indicador({
  rotulo,
  valor,
  complemento,
  alerta,
}: {
  rotulo: string;
  valor: string;
  complemento?: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-borda bg-superficie p-4 md:p-[18px]">
      <span className="text-sm text-texto-secundario">{rotulo}</span>
      <span className={cn("text-2xl font-bold md:text-[28px]", alerta && "text-perigo")}>
        {valor}
        {complemento && (
          <span className="ml-1.5 text-[15px] font-medium text-texto-secundario">
            {complemento}
          </span>
        )}
      </span>
    </div>
  );
}

async function AbaHistorico({
  slug,
  empresaId,
  clienteId,
  vePrecos,
  filtro,
  base,
}: {
  slug: string;
  empresaId: string;
  clienteId: string;
  vePrecos: boolean;
  filtro: z.output<typeof filtroSchema>;
  base: string;
}) {
  const { itens, total } = await historicoOsCliente(
    empresaId,
    clienteId,
    { q: filtro.q, status: filtro.status, pagina: filtro.pagina },
    vePrecos,
  );
  const filtrando = !!filtro.q || filtro.status !== "todos";
  return (
    <div>
      <div className="flex flex-wrap gap-2.5 p-4">
        <BuscaUrl
          className="min-w-0 flex-1 basis-64"
          placeholder="Filtrar por placa, motor ou nº da OS"
          rotulo="Filtrar histórico de OS"
        />
        <FiltroSelectUrl
          param="status"
          rotulo="Filtrar por status"
          padrao="todos"
          opcoes={OPCOES_STATUS}
          className="w-full sm:w-56"
        />
      </div>
      <TabelaOs
        slug={slug}
        os={itens}
        vePrecos={vePrecos}
        vazio={
          filtrando
            ? { titulo: "Nenhuma OS com esses filtros", descricao: "Ajuste a busca ou o status." }
            : {
                titulo: "Este cliente ainda não tem OS",
                descricao: "Use “Nova OS para este cliente” para abrir a primeira.",
              }
        }
      />
      <Paginacao
        className="p-4"
        pagina={filtro.pagina}
        porPagina={POR_PAGINA_HISTORICO}
        total={total}
        href={(p) =>
          montarHref(base, { q: filtro.q, status: filtro.status, pagina: p }, { status: "todos" })
        }
      />
    </div>
  );
}

async function AbaMotores({
  slug,
  empresaId,
  cliente,
  podeEditar,
}: {
  slug: string;
  empresaId: string;
  cliente: { id: string; nome: string };
  podeEditar: boolean;
}) {
  const motores = await listarMotoresDoCliente(empresaId, cliente.id);
  return (
    <div className="p-4">
      {podeEditar && (
        <div className="mb-4 flex justify-end">
          <MotorSheet cliente={cliente} clienteFixo>
            <Button variant="outline">
              <Plus aria-hidden /> Novo motor
            </Button>
          </MotorSheet>
        </div>
      )}
      {motores.length === 0 ? (
        <EmptyState
          icone={<Cog aria-hidden />}
          titulo="Nenhum motor vinculado"
          descricao="Os motores aparecem aqui quando forem cadastrados ou recebidos em uma OS deste cliente."
        />
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {motores.map((m) => (
            <li key={m.id}>
              <Link
                href={`/${slug}/motores/${m.id}`}
                className="flex min-h-20 flex-col gap-1 rounded-xl border border-borda bg-superficie p-4 hover:bg-fundo"
              >
                <span className="font-semibold">{descricaoMotor(m)}</span>
                <span className="text-sm text-texto-secundario">
                  {[
                    m.numero_serie && `Série ${m.numero_serie}`,
                    m.combustivel && ROTULO_COMBUSTIVEL[m.combustivel],
                    m.cilindros && `${m.cilindros} cil.`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem detalhes técnicos"}
                </span>
                {(m.veiculo_placa || m.veiculo_modelo) && (
                  <span className="text-sm text-texto-secundario">
                    <span className="font-mono">{formatarPlaca(m.veiculo_placa)}</span>
                    {m.veiculo_modelo && ` · ${m.veiculo_modelo}`}
                    {m.veiculo_ano && ` ${m.veiculo_ano}`}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AbaDados({
  cliente,
  vePrecos,
  tabelaNome,
}: {
  cliente: NonNullable<Awaited<ReturnType<typeof obterCliente>>>;
  vePrecos: boolean;
  tabelaNome: string | null;
}) {
  const e = (cliente.endereco ?? {}) as Record<string, string | undefined>;
  const endereco = [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.complemento,
    e.bairro,
    [e.cidade, e.uf].filter(Boolean).join("/"),
    e.cep && `CEP ${e.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const linhas: [string, string | null][] = [
    ["Tipo", ROTULO_TIPO_CLIENTE[cliente.tipo]],
    ["Nome / razão social", cliente.nome],
    ["Nome fantasia", cliente.nome_fantasia],
    ["CPF / CNPJ", cliente.documento ? formatarDocumento(cliente.documento) : null],
    ["Inscrição estadual", cliente.ie],
    ["WhatsApp", cliente.telefone_whatsapp ? formatarTelefone(cliente.telefone_whatsapp) : null],
    ["E-mail", cliente.email],
    ["Endereço", endereco || null],
    ...(vePrecos
      ? ([
          ["Tabela de preço", tabelaNome ?? "Padrão do tipo de cliente"],
          [
            "Limite de crédito",
            cliente.limite_credito === null ? null : formatarMoeda(cliente.limite_credito),
          ],
          ["Condição de pagamento", cliente.condicao_pagamento],
          ["Dia de fechamento", cliente.dia_fechamento ? `Dia ${cliente.dia_fechamento}` : null],
        ] as [string, string | null][])
      : []),
    ["Observações", cliente.observacoes],
    ["Situação", cliente.ativo ? "Ativo" : "Inativo"],
  ];
  return (
    <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2">
      {linhas.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-sm text-texto-secundario">{k}</dt>
          <dd className="mt-0.5 text-[15px] font-medium break-words whitespace-pre-line text-texto">
            {v || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
