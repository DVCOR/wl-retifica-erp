import Link from "next/link";
import { Banknote, ClipboardList, Hammer, Plus, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_OS, COLUNAS_QUADRO } from "@/lib/os/status";
import { formatarMoeda } from "@/lib/format";
import type { InicioBalcao, InicioDono, InicioFinanceiro, InicioTecnico } from "@/lib/data/inicio";
import { rotuloPrazo } from "@/lib/os/quadro";
import { BlocoLista, CartaoNumero, LinhaOs } from "./blocos";
import { GraficoSemanas } from "./grafico-semanas";

export function VisaoBalcao({ slug, d }: { slug: string; d: InicioBalcao }) {
  return (
    <div className="grid gap-4">
      <Button asChild size="lg" className="h-16 w-full text-lg md:w-auto md:self-start md:px-10">
        <Link href={`/${slug}/os/nova`}>
          <Plus className="size-6" strokeWidth={2.5} aria-hidden />
          Nova OS
        </Link>
      </Button>
      <div className="grid gap-4 lg:grid-cols-3">
        <BlocoLista
          titulo="Recebimento do dia"
          total={d.recebimento.length}
          vazio="Nenhuma OS em recebimento nem recebida hoje."
        >
          {d.recebimento.map((o) => (
            <LinhaOs key={o.id} slug={slug} os={o} />
          ))}
        </BlocoLista>
        <BlocoLista
          titulo={`Orçamentos sem resposta (> ${d.diasLimite} dias)`}
          total={d.orcamentosParados.length}
          vazio="Nenhum orçamento esperando resposta além do prazo."
        >
          {d.orcamentosParados.map((o) => (
            <LinhaOs
              key={o.id}
              slug={slug}
              os={o}
              extra={
                <span className="shrink-0 text-sm font-semibold text-alerta">
                  {o.diasParado} dias
                </span>
              }
            />
          ))}
        </BlocoLista>
        <BlocoLista
          titulo="Prontas para avisar ou entregar"
          total={d.prontas.length}
          vazio="Nenhuma OS pronta aguardando retirada."
        >
          {d.prontas.map((o) => (
            <LinhaOs key={o.id} slug={slug} os={o} />
          ))}
        </BlocoLista>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <AtalhoCard
          href={`/${slug}/os`}
          icone={<ClipboardList aria-hidden />}
          rotulo="Quadro de OS"
        />
        <AtalhoCard href={`/${slug}/clientes`} icone={<Users aria-hidden />} rotulo="Clientes" />
        <AtalhoCard href={`/${slug}/motores`} icone={<Wrench aria-hidden />} rotulo="Motores" />
      </div>
    </div>
  );
}

function AtalhoCard({
  href,
  icone,
  rotulo,
}: {
  href: string;
  icone: React.ReactNode;
  rotulo: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 rounded-xl border border-borda bg-superficie px-4 font-semibold hover:border-borda-forte [&_svg]:size-5 [&_svg]:text-primaria"
    >
      {icone}
      {rotulo}
    </Link>
  );
}

export function VisaoTecnico({ slug, d }: { slug: string; d: InicioTecnico }) {
  return (
    <div className="grid gap-4">
      <Button asChild size="lg" className="h-16 w-full text-lg md:w-auto md:self-start md:px-10">
        <Link href={`/${slug}/bancada`}>
          <Wrench className="size-6" aria-hidden />
          Abrir minha bancada
        </Link>
      </Button>
      <div className="grid gap-4 lg:grid-cols-2">
        <BlocoLista
          titulo="Atrasadas"
          total={d.atrasadas.length}
          vazio="Nenhuma OS atrasada. Bom trabalho!"
        >
          {d.atrasadas.map((o) => (
            <LinhaOs
              key={o.id}
              slug={slug}
              os={o}
              href={`/${slug}/bancada?os=${o.id}`}
              extra={
                <span className="shrink-0 text-sm font-semibold text-perigo">
                  {rotuloPrazo({ prazo: o.prazo, status: o.status }, d.hoje)}
                </span>
              }
            />
          ))}
        </BlocoLista>
        <BlocoLista
          titulo="Minhas OS atribuídas"
          total={d.minhas.length}
          vazio="Nenhuma OS atribuída a você no momento."
        >
          {d.minhas.map((o) => (
            <LinhaOs key={o.id} slug={slug} os={o} href={`/${slug}/bancada?os=${o.id}`} />
          ))}
        </BlocoLista>
      </div>
    </div>
  );
}

export function VisaoFinanceiro({ d }: { d: InicioFinanceiro }) {
  return (
    <div className="grid gap-4">
      <EmptyState
        icone={<Banknote aria-hidden />}
        titulo="Módulo financeiro chega na Fase 2"
        descricao="Contas a receber, vencimentos e fechamento de lojistas serão liberados na próxima fase. Enquanto isso, acompanhe o mês abaixo."
        className="py-8"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CartaoNumero rotulo="OS entregues no mês" valor={d.entreguesNoMes} />
        {d.valorAprovadoNoMes !== null && (
          <CartaoNumero
            rotulo="Valor aprovado no mês"
            valor={formatarMoeda(d.valorAprovadoNoMes)}
            detalhe={`${d.aprovadosNoMes ?? 0} orçamento${d.aprovadosNoMes === 1 ? "" : "s"} aprovado${d.aprovadosNoMes === 1 ? "" : "s"}`}
          />
        )}
      </div>
    </div>
  );
}

export function VisaoDono({ slug, d }: { slug: string; d: InicioDono }) {
  const maxRanking = Math.max(1, ...d.ranking.map((r) => r.valor));
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <CartaoNumero
          rotulo="OS atrasadas"
          valor={d.atrasadas}
          tom={d.atrasadas > 0 ? "perigo" : "sucesso"}
          detalhe={d.atrasadas > 0 ? "prazo prometido vencido" : "tudo no prazo"}
        />
        <CartaoNumero rotulo="Entregues no mês" valor={d.entreguesNoMes} />
        <CartaoNumero rotulo="Aprovado no mês" valor={formatarMoeda(d.valorAprovadoNoMes)} />
        <CartaoNumero
          rotulo="Ticket médio"
          valor={d.ticketMedio === null ? "—" : formatarMoeda(d.ticketMedio)}
          detalhe="por orçamento aprovado"
        />
        <CartaoNumero
          rotulo="Lojista × final"
          valor={d.percentual ? `${d.percentual.lojista}% × ${d.percentual.final}%` : "—"}
          detalhe="OS abertas no mês"
          className="col-span-2 lg:col-span-1 xl:col-span-2"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OS abertas por status</CardTitle>
          <CardDescription>Toque para ver no quadro.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {COLUNAS_QUADRO.map((s) => (
              <li key={s}>
                <Link
                  href={`/${slug}/os`}
                  className="flex min-h-16 flex-col justify-between rounded-lg border border-borda p-3 hover:border-borda-forte"
                >
                  <span className="text-2xl font-bold tabular-nums">{d.porStatus[s] ?? 0}</span>
                  <span className="text-sm text-texto-secundario">{STATUS_OS[s].rotulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="size-4 text-primaria" aria-hidden />
              OS abertas e entregues por semana
            </CardTitle>
            <CardDescription>Últimas 8 semanas.</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoSemanas pontos={d.semanas} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 5 lojistas do mês</CardTitle>
            <CardDescription>Por valor aprovado.</CardDescription>
          </CardHeader>
          <CardContent>
            {d.ranking.length === 0 ? (
              <p className="rounded-lg bg-fundo px-4 py-6 text-center text-[15px] text-texto-secundario">
                Nenhum orçamento de lojista aprovado neste mês.
              </p>
            ) : (
              <ol className="grid gap-3">
                {d.ranking.map((r, i) => (
                  <li key={r.clienteId}>
                    <Link
                      href={`/${slug}/clientes/${r.clienteId}`}
                      className="block rounded-lg py-1 hover:bg-fundo"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium">
                          {i + 1}. {r.nome}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {formatarMoeda(r.valor)}
                        </span>
                      </span>
                      <span className="mt-1 block h-2 rounded-full bg-fundo" role="presentation">
                        <span
                          className="block h-2 rounded-full bg-primaria"
                          style={{ width: `${Math.max(4, (r.valor / maxRanking) * 100)}%` }}
                        />
                      </span>
                      <span className="text-xs text-texto-secundario">
                        {r.qtd} orçamento{r.qtd === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
