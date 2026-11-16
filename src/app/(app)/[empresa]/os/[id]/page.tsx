import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FileText, Printer } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ResumoLaudo } from "@/components/orcamento/resumo-laudo";
import { ResumoOrcamento } from "@/components/orcamento/resumo-orcamento";
import { StatusBadge } from "@/components/app/status-badge";
import { AcoesStatus } from "@/components/os/acoes-os";
import { AbrirOsGarantia, EntregarOs } from "@/components/os/entrega-os";
import { CorrigirChecklist } from "@/components/os/corrigir-checklist";
import { ExecucaoOs } from "@/components/os/execucao-os";
import { TrocaTecnico } from "@/components/os/troca-tecnico";
import { UsarRealtime } from "@/components/os/usar-realtime";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import {
  listarAnexosOs,
  listarDivergenciasChecklist,
  listarHistoricoOs,
  listarResponsaveis,
  obterEntregaGarantia,
  obterExecucaoOs,
  obterOsDetalhe,
  obterOsOrigem,
} from "@/lib/data/os";
import { formatarData, formatarDataHora, formatarPlaca } from "@/lib/format";
import { hojeSaoPaulo, rotuloPrazo, estaAtrasada } from "@/lib/os/quadro";
import { STATUS_OS } from "@/lib/os/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "OS" };

const ABAS = [
  ["resumo", "Resumo"],
  ["checklist", "Checklist"],
  ["laudo", "Laudo"],
  ["orcamento", "Orçamento"],
  ["execucao", "Execução"],
  ["anexos", "Anexos"],
  ["historico", "Histórico"],
] as const;
type Aba = (typeof ABAS)[number][0];

const ROTULO_CHECK: Record<string, string> = { danificado: "Danificado", ausente: "Ausente" };
const ROTULO_ETAPA: Record<string, string> = {
  recebimento: "Recebimento",
  analise: "Análise",
  execucao: "Execução",
  entrega: "Entrega",
};

export default async function OsDetalhePage({
  params,
  searchParams,
}: PageProps<"/[empresa]/os/[id]">) {
  const { empresa: slug, id } = await params;
  const sp = await searchParams;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const os = await obterOsDetalhe(empresa.id, id);
  if (!os) notFound();

  const papel = membro.papel;
  const abaParam = typeof sp.aba === "string" ? sp.aba : "resumo";
  const aba: Aba = ABAS.some(([k]) => k === abaParam) ? (abaParam as Aba) : "resumo";
  const hoje = hojeSaoPaulo();
  const atrasada = estaAtrasada({ prazo: os.prazo_prometido, status: os.status }, hoje);
  const atribuida = os.tecnico_id === membro.id;
  const garantiaPadrao = os.garantia_dias ?? empresa.config.garantia_dias_padrao ?? 90;
  const dentroGarantia = !!os.garantia_ate && os.garantia_ate >= hoje;

  const [responsaveis, origem, entregaGarantia] = await Promise.all([
    pode(papel, "os.editar") ? listarResponsaveis(empresa.id) : Promise.resolve([]),
    os.os_origem_id ? obterOsOrigem(empresa.id, os.os_origem_id) : Promise.resolve(null),
    obterEntregaGarantia(empresa.id, id),
  ]);

  const base = `/${slug}/os/${id}`;
  const quando = (a: Aba) => (a === "resumo" ? base : `${base}?aba=${a}`);

  return (
    <>
      <UsarRealtime empresaId={empresa.id} />
      <PageHeader
        voltar={{ href: `/${slug}/os`, rotulo: "Quadro de OS" }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <span>OS {os.numero}</span>
            <StatusBadge status={os.status} />
            {os.eh_garantia && (
              <span className="rounded-md bg-perigo-suave px-2 py-0.5 text-sm font-semibold text-perigo">
                Garantia
              </span>
            )}
          </span>
        }
        descricao={STATUS_OS[os.status].descricao}
        acoes={
          <div className="flex flex-wrap gap-2">
            {os.status !== "em_recebimento" && (
              <Button asChild variant="outline">
                <a href={`${base}/comprovante-recebimento`} target="_blank" rel="noreferrer">
                  <FileText aria-hidden /> Comprovante PDF
                </a>
              </Button>
            )}
            <Button asChild variant="outline">
              <a href={`${base}/etiqueta`} target="_blank" rel="noreferrer">
                <Printer aria-hidden /> Etiqueta
              </a>
            </Button>
          </div>
        }
      />

      <section className="mb-4 grid gap-4 rounded-xl border border-borda bg-superficie p-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-sm text-texto-secundario">Cliente</div>
          {os.cliente ? (
            <Link
              href={`/${slug}/clientes/${os.cliente.id}`}
              className="font-semibold text-primaria hover:underline"
            >
              {os.cliente.nome}
            </Link>
          ) : (
            "—"
          )}
          <div className="text-sm text-texto-secundario">
            {os.cliente?.tipo === "lojista" ? "Lojista" : "Cliente final"}
          </div>
        </div>
        <div>
          <div className="text-sm text-texto-secundario">Motor</div>
          {os.motor ? (
            <Link href={`/${slug}/motores/${os.motor.id}`} className="font-semibold hover:underline">
              {os.motor.descricao}
            </Link>
          ) : (
            <span className="font-semibold">Sem motor</span>
          )}
          {(os.cliente_final_placa || os.motor?.placa) && (
            <div className="text-sm text-texto-secundario">
              Carro do cliente:{" "}
              <span className="font-mono text-texto">
                {formatarPlaca(os.cliente_final_placa ?? os.motor?.placa)}
              </span>
              {os.cliente_final_nome && <> · {os.cliente_final_nome}</>}
            </div>
          )}
        </div>
        <div>
          <div className="text-sm text-texto-secundario">Prazo prometido</div>
          <div className={cn("font-semibold", atrasada && "text-perigo")}>
            {formatarData(os.prazo_prometido)}
          </div>
          <div className={cn("text-sm", atrasada ? "font-semibold text-perigo" : "text-texto-secundario")}>
            {rotuloPrazo({ prazo: os.prazo_prometido, status: os.status }, hoje)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-sm text-texto-secundario">Técnico responsável</div>
          {pode(papel, "os.editar") ? (
            <TrocaTecnico
              slug={slug}
              osId={id}
              atual={os.tecnico_id}
              opcoes={responsaveis.map((r) => ({ id: r.id, nome: r.nome }))}
            />
          ) : (
            <span className="font-semibold">{os.tecnico_nome ?? "Sem técnico"}</span>
          )}
        </div>
      </section>

      {origem && (
        <p className="mb-4 rounded-lg bg-perigo-suave p-3 text-sm">
          Retorno em garantia da{" "}
          <Link className="font-semibold underline" href={`/${slug}/os/${origem.id}`}>
            OS {origem.numero}
          </Link>
          .
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <AcoesStatus
          slug={slug}
          osId={id}
          status={os.status}
          papel={papel}
          atribuidaAoMembro={atribuida}
        />
        {pode(papel, "os.entregar") && (os.status === "pronto" || os.status === "reprovado") && (
          <EntregarOs
            slug={slug}
            empresaId={empresa.id}
            osId={id}
            numero={os.numero}
            garantiaDiasPadrao={garantiaPadrao}
            podeEditarGarantia={pode(papel, "os.editar")}
          />
        )}
        {os.status === "entregue" && dentroGarantia && pode(papel, "os.abrir") && (
          <AbrirOsGarantia slug={slug} osId={id} />
        )}
      </div>

      <nav aria-label="Seções da OS" className="mb-4 flex gap-1 overflow-x-auto border-b border-borda">
        {ABAS.map(([k, rotulo]) => (
          <Link
            key={k}
            href={quando(k)}
            aria-current={aba === k ? "page" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center border-b-2 px-4 text-[15px] font-medium",
              aba === k
                ? "border-primaria text-primaria"
                : "border-transparent text-texto-secundario hover:text-texto",
            )}
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      {aba === "resumo" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-borda bg-superficie p-4">
            <h2 className="mb-2 text-lg font-semibold">Dados da OS</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-texto-secundario">Entrada</dt>
              <dd>{formatarData(os.created_at)}</dd>
              <dt className="text-texto-secundario">Observações</dt>
              <dd>{os.observacoes ?? "—"}</dd>
              {os.motivo_cancelamento && (
                <>
                  <dt className="text-texto-secundario">Cancelamento</dt>
                  <dd>{os.motivo_cancelamento}</dd>
                </>
              )}
            </dl>
          </section>
          <section className="rounded-xl border border-borda bg-superficie p-4">
            <h2 className="mb-2 text-lg font-semibold">Entrega e garantia</h2>
            {os.status === "entregue" ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                <dt className="text-texto-secundario">Entregue em</dt>
                <dd>{formatarDataHora(os.entregue_em)}</dd>
                <dt className="text-texto-secundario">Retirado por</dt>
                <dd>{entregaGarantia.entregaAssinatura?.nome ?? "—"}</dd>
                <dt className="text-texto-secundario">Garantia</dt>
                <dd>
                  {os.garantia_dias ?? 0} dias · até {formatarData(os.garantia_ate)}
                  {!dentroGarantia && " (vencida)"}
                </dd>
                <dt className="text-texto-secundario">OS de garantia</dt>
                <dd>
                  {entregaGarantia.garantiaOs.length === 0
                    ? "Nenhuma"
                    : entregaGarantia.garantiaOs.map((g) => (
                        <Link key={g.id} href={`/${slug}/os/${g.id}`} className="mr-2 text-primaria underline">
                          {g.numero}
                        </Link>
                      ))}
                </dd>
              </dl>
            ) : (
              <p className="text-[15px] text-texto-secundario">
                Garantia padrão: {garantiaPadrao} dias, contados a partir da entrega.
              </p>
            )}
          </section>
        </div>
      )}

      {aba === "checklist" && (
        <AbaChecklist
          slug={slug}
          osId={id}
          status={os.status}
          empresaId={empresa.id}
          podeCorrigir={papel === "dono"}
        />
      )}

      {aba === "laudo" && <ResumoLaudo osId={id} slug={slug} />}

      {aba === "orcamento" && <ResumoOrcamento osId={id} slug={slug} />}

      {aba === "execucao" && (
        <AbaExecucao
          slug={slug}
          empresaId={empresa.id}
          osId={id}
          membroId={membro.id}
          podeApontar={pode(papel, "apontamento.registrar")}
        />
      )}

      {aba === "anexos" && <AbaAnexos empresaId={empresa.id} osId={id} />}
      {aba === "historico" && <AbaHistorico empresaId={empresa.id} osId={id} />}
    </>
  );
}

async function AbaChecklist({
  slug,
  osId,
  status,
  empresaId,
  podeCorrigir,
}: {
  slug: string;
  osId: string;
  status: string;
  empresaId: string;
  podeCorrigir: boolean;
}) {
  const { total, itens, divergencias } = await listarDivergenciasChecklist(empresaId, osId);
  const corrigivel = podeCorrigir && status !== "em_recebimento" && itens.length > 0;
  return (
    <section className="rounded-xl border border-borda bg-superficie p-4">
      <h2 className="mb-1 text-lg font-semibold">Checklist de recebimento</h2>
      <p className="mb-3 text-[15px] text-texto-secundario">
        {total} itens · {divergencias.length === 0 ? "sem divergências" : `${divergencias.length} divergência(s)`}
      </p>
      {status === "em_recebimento" && (
        <Button asChild className="mb-3">
          <Link href={`/${slug}/os/${osId}/recebimento`}>Continuar recebimento</Link>
        </Button>
      )}
      {divergencias.length > 0 && (
        <ul className="flex flex-col gap-2">
          {divergencias.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-alerta-suave p-3 text-[15px]"
            >
              <div>
                <span className="font-semibold">{d.descricao}</span>{" "}
                <span className="text-texto-secundario">
                  ({d.grupo}) · {ROTULO_CHECK[d.status] ?? d.status}
                  {d.quantidade !== null && ` · qtd ${d.quantidade}`}
                </span>
                {d.observacao && <div className="text-sm">{d.observacao}</div>}
              </div>
              {corrigivel && <CorrigirChecklist slug={slug} osId={osId} itens={itens} itemId={d.id} />}
            </li>
          ))}
        </ul>
      )}
      {corrigivel && (
        <div className="mt-3">
          <CorrigirChecklist slug={slug} osId={osId} itens={itens} rotulo="Corrigir outro item" />
        </div>
      )}
    </section>
  );
}

async function AbaExecucao({
  slug,
  empresaId,
  osId,
  membroId,
  podeApontar,
}: {
  slug: string;
  empresaId: string;
  osId: string;
  membroId: string;
  podeApontar: boolean;
}) {
  const { itens, apontamentos } = await obterExecucaoOs(empresaId, osId);
  return (
    <ExecucaoOs
      slug={slug}
      osId={osId}
      membroId={membroId}
      itens={itens}
      apontamentos={apontamentos}
      podeApontar={podeApontar}
    />
  );
}

async function AbaAnexos({ empresaId, osId }: { empresaId: string; osId: string }) {
  const anexos = await listarAnexosOs(empresaId, osId);
  if (anexos.length === 0) {
    return <EmptyState icone={<FileText aria-hidden />} titulo="Nenhuma foto ou anexo ainda" />;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {anexos.map((a) => (
        <li key={a.id} className="overflow-hidden rounded-xl border border-borda bg-superficie">
          {a.url ? (
            <a href={a.url} target="_blank" rel="noreferrer" aria-label="Abrir foto em tamanho maior">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage */}
              <img src={a.url} alt={a.legenda ?? `Foto da ${ROTULO_ETAPA[a.etapa]}`} loading="lazy" className="aspect-square w-full object-cover" />
            </a>
          ) : (
            <div className="flex aspect-square items-center justify-center text-sm text-texto-secundario">
              Indisponível
            </div>
          )}
          <div className="p-2 text-xs text-texto-secundario">
            {ROTULO_ETAPA[a.etapa]} · {formatarDataHora(a.quando)}
            {a.legenda && <div className="text-texto">{a.legenda}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

async function AbaHistorico({ empresaId, osId }: { empresaId: string; osId: string }) {
  const eventos = await listarHistoricoOs(empresaId, osId);
  return (
    <ol className="flex flex-col gap-3 border-l-2 border-borda pl-4">
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-[22px] size-3 rounded-full bg-primaria" aria-hidden />
          <div className="flex flex-wrap items-center gap-2">
            {e.de && (
              <>
                <StatusBadge status={e.de} /> <span aria-hidden>→</span>
              </>
            )}
            <StatusBadge status={e.para} />
          </div>
          <div className="text-sm text-texto-secundario">
            {formatarDataHora(e.quando)} · {e.quem ?? "Sistema"}
          </div>
          {e.motivo && <div className="text-sm">{e.motivo}</div>}
        </li>
      ))}
    </ol>
  );
}
