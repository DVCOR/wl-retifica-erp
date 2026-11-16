import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { StatusBadge } from "@/components/app/status-badge";
import { BotaoVersao } from "@/components/orcamento/botao-versao";
import { EditorOrcamento } from "@/components/orcamento/editor-orcamento";
import { EnvioOrcamento } from "@/components/orcamento/envio-orcamento";
import { HistoricoVersoes } from "@/components/orcamento/historico-versoes";
import { EmptyState } from "@/components/ui/empty-state";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import {
  type ItemOrcamentoRow,
  listarItensOrcamento,
  listarMedicoes,
  listarVersoes,
  obterOsOrcamento,
} from "@/lib/data/orcamento";
import { SITE_URL } from "@/lib/env";
import { formatarMoeda, formatarNumeroOs } from "@/lib/format";
import { modoLocal } from "@/lib/modo";
import { linkPublicoOs } from "@/lib/orcamento/mensagens";

export const metadata: Metadata = { title: "Orçamento da OS" };

export default async function OrcamentoPage({ params }: PageProps<"/[empresa]/os/[id]/orcamento">) {
  const { empresa: slug, id } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "orcamento.montar")) return <SemAcesso slug={slug} />;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const os = await obterOsOrcamento(empresa.id, id);
  if (!os) notFound();

  const [versoes, medicoes] = await Promise.all([
    listarVersoes(empresa.id, id),
    listarMedicoes(empresa.id, id),
  ]);
  const atual = versoes[0] ?? null;
  const itens = atual ? await listarItensOrcamento(empresa.id, atual.id) : [];
  const link = modoLocal() ? "" : linkPublicoOs(SITE_URL, os.token_publico);
  const numero = formatarNumeroOs(os.numero);

  return (
    <>
      <PageHeader
        voltar={{ href: `/${slug}/os/${id}`, rotulo: `OS ${numero}` }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            Orçamento
            {atual && (
              <span className="text-base font-medium text-texto-secundario">
                versão {atual.versao}
              </span>
            )}
            <StatusBadge status={os.status} />
          </span>
        }
        descricao={`${os.cliente.nome}${os.motor ? ` · ${[os.motor.marca, os.motor.modelo].filter(Boolean).join(" ")}` : ""}`}
      />

      <div className="mx-auto max-w-4xl space-y-6">
        {!atual ? (
          <EmptyState
            titulo="Esta OS ainda não tem orçamento"
            descricao="Comece o rascunho: o preço vem da tabela do cliente e a quantidade, do motor."
            acoes={<BotaoVersao slug={slug} osId={id} rotulo="Iniciar orçamento" />}
          />
        ) : atual.status === "rascunho" ? (
          <EditorOrcamento
            slug={slug}
            osId={id}
            orcamento={{
              id: atual.id,
              versao: atual.versao,
              desconto: Number(atual.desconto),
              validade: atual.validade,
              observacoes: atual.observacoes,
              descontoAprovado: atual.desconto_aprovado_por !== null,
            }}
            itens={itens.map((i) => ({
              id: i.id,
              tipo: i.tipo,
              descricao: i.descricao,
              quantidade: Number(i.quantidade),
              preco_unitario: Number(i.preco_unitario ?? 0),
              desconto: Number(i.desconto),
              sugerido_por: i.sugerido_por,
            }))}
            tabelaPrecoId={os.cliente.tabela_preco_id}
          />
        ) : (
          <>
            <ItensSomenteLeitura
              itens={itens}
              total={Number(atual.total)}
              desconto={Number(atual.desconto)}
            />
            <EnvioOrcamento
              slug={slug}
              osId={id}
              numeroOs={numero}
              empresaNome={empresa.nome_fantasia}
              nomeCliente={os.cliente.nome}
              telefoneCliente={os.cliente.telefone_whatsapp}
              orcamento={{
                id: atual.id,
                versao: atual.versao,
                status: atual.status,
                total: Number(atual.total),
                validade: atual.validade,
                respondido_por_nome: atual.respondido_por_nome,
              }}
              link={link}
              temLaudo={medicoes.length > 0}
            />
          </>
        )}

        {versoes.length > 0 && (
          <section className="space-y-2" aria-label="Histórico de versões">
            <h2 className="text-lg font-bold">Histórico de versões</h2>
            <HistoricoVersoes
              versoes={versoes.map((v) => ({
                id: v.id,
                versao: v.versao,
                status: v.status,
                total: Number(v.total),
                enviado_em: v.enviado_em,
                respondido_em: v.respondido_em,
                respondido_por_nome: v.respondido_por_nome,
                canal: v.canal,
              }))}
            />
          </section>
        )}
      </div>
    </>
  );
}

function ItensSomenteLeitura({
  itens,
  total,
  desconto,
}: {
  itens: ItemOrcamentoRow[];
  total: number;
  desconto: number;
}) {
  return (
    <section aria-label="Itens enviados" className="rounded-xl border border-borda bg-superficie">
      <ul className="divide-y divide-borda">
        {itens.map((i) => (
          <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-3 text-[15px]">
            <span className="min-w-0">
              {i.descricao}
              <span className="block text-sm text-texto-secundario">
                {Number(i.quantidade)} × {formatarMoeda(i.preco_unitario)}
                {Number(i.desconto) > 0 && ` − ${formatarMoeda(i.desconto)}`}
              </span>
            </span>
            <span className="font-semibold tabular-nums">{formatarMoeda(i.total)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t border-borda px-4 py-3">
        {desconto > 0 && (
          <p className="flex justify-between text-[15px] text-texto-secundario">
            <span>Desconto no total</span>
            <span className="tabular-nums">−{formatarMoeda(desconto)}</span>
          </p>
        )}
        <p className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatarMoeda(total)}</span>
        </p>
      </div>
    </section>
  );
}
