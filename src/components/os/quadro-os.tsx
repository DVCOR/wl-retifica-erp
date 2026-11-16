"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { LayoutGrid, List, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { podeMoverOs, type OsStatus, type Papel } from "@/lib/auth/permissoes";
import {
  agruparPorColuna,
  destinosPermitidos,
  estaAtrasada,
  filtrarCartoes,
  FILTROS_PADRAO,
  type CartaoOs,
  type FiltrosQuadro,
} from "@/lib/os/quadro";
import { COLUNAS_QUADRO, STATUS_OS } from "@/lib/os/status";
import { cn } from "@/lib/utils";
import { moverStatusAction } from "@/app/(app)/[empresa]/os/actions";
import { ConteudoCartao } from "./cartao-os";
import { useRealtimeOs } from "./use-realtime-os";

type Tecnico = { id: string; nome: string };

type Props = {
  slug: string;
  empresaId: string;
  papel: Papel;
  membroId: string;
  cartoes: CartaoOs[];
  tecnicos: Tecnico[];
  hoje: string;
  modo?: "aberto" | "encerradas";
};

function CartaoArrastavel({
  cartao,
  podeArrastar,
  children,
}: {
  cartao: CartaoOs;
  podeArrastar: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cartao.id,
    disabled: !podeArrastar,
  });
  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`OS ${cartao.numero}, ${cartao.clienteNome}`}
      className={cn(
        "rounded-[10px] border border-borda bg-superficie p-3 shadow-sm focus-visible:outline-2 focus-visible:outline-primaria",
        podeArrastar && "cursor-grab touch-manipulation active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {children}
    </article>
  );
}

function ColunaSoltavel({
  status,
  total,
  children,
}: {
  status: OsStatus;
  total: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_OS[status].rotulo}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2.5 rounded-xl bg-neutro-suave p-2.5 transition-colors",
        isOver && "bg-primaria-suave outline-2 outline-primaria",
      )}
    >
      <header className="flex items-center justify-between px-1.5 py-1">
        <h2 className="text-sm font-semibold text-texto">{STATUS_OS[status].rotulo}</h2>
        <span className="rounded-full bg-superficie px-2.5 py-0.5 text-[13px] font-semibold text-neutro">
          {total}
        </span>
      </header>
      {children}
    </section>
  );
}

export function QuadroOs({
  slug,
  empresaId,
  papel,
  membroId,
  cartoes: cartoesServidor,
  tecnicos,
  hoje,
  modo = "aberto",
}: Props) {
  const router = useRouter();
  useRealtimeOs(empresaId, ["os"]);
  const [cartoes, setCartoes] = React.useState(cartoesServidor);
  const [origem, setOrigem] = React.useState(cartoesServidor);
  if (origem !== cartoesServidor) {
    // novos dados do servidor (refresh/realtime) substituem o estado otimista
    setOrigem(cartoesServidor);
    setCartoes(cartoesServidor);
  }

  const [filtros, setFiltros] = React.useState<FiltrosQuadro>(FILTROS_PADRAO);
  const [visao, setVisao] = React.useState<"quadro" | "lista">("quadro");
  const [aba, setAba] = React.useState<string>("todas");
  const [ativo, setAtivo] = React.useState<CartaoOs | null>(null);
  const [erroMover, setErroMover] = React.useState<{ numero: string; msg: string } | null>(null);
  const [, iniciar] = React.useTransition();

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const rascunhos = cartoes.filter((c) => c.status === "em_recebimento");
  const abertas = cartoes.filter((c) => c.status !== "em_recebimento");
  const filtradas = filtrarCartoes(abertas, filtros, hoje);
  const colunas = agruparPorColuna(filtradas, hoje);
  const atrasadasTotal = abertas.filter((c) => estaAtrasada(c, hoje)).length;
  const emBancada = modo === "aberto";

  const atribuida = (c: CartaoOs) => c.tecnicoId === membroId;
  const destinos = (c: CartaoOs) => (emBancada ? destinosPermitidos(papel, c, atribuida(c)) : []);

  function mover(c: CartaoOs, para: OsStatus, desfazer = true) {
    if (c.status === para) return;
    const anterior = c.status;
    setCartoes((l) => l.map((x) => (x.id === c.id ? { ...x, status: para } : x)));
    iniciar(async () => {
      const r = await moverStatusAction(slug, c.id, { status: para });
      if (!r.ok) {
        setCartoes((l) => l.map((x) => (x.id === c.id ? { ...x, status: anterior } : x)));
        setErroMover({ numero: c.numero, msg: r.erro });
        return;
      }
      const podeDesfazer = desfazer && podeMoverOs(papel, para, anterior, { atribuidaAoMembro: atribuida(c) });
      toast.success(`OS ${c.numero} movida para ${STATUS_OS[para].rotulo}.`, {
        action: podeDesfazer
          ? { label: "Desfazer", onClick: () => mover({ ...c, status: para }, anterior, false) }
          : undefined,
      });
      router.refresh();
    });
  }

  function aoSoltar(e: DragEndEvent) {
    setAtivo(null);
    const c = cartoes.find((x) => x.id === e.active.id);
    const para = e.over?.id as OsStatus | undefined;
    if (!c || !para || c.status === para) return;
    if (!podeMoverOs(papel, c.status, para, { atribuidaAoMembro: atribuida(c) })) {
      setErroMover({
        numero: c.numero,
        msg: `Não é possível mover de ${STATUS_OS[c.status].rotulo} para ${STATUS_OS[para].rotulo}.`,
      });
      return;
    }
    mover(c, para);
  }

  function aoComecar(e: DragStartEvent) {
    setAtivo(cartoes.find((x) => x.id === e.active.id) ?? null);
  }

  const itemLista = (c: CartaoOs) => (
    <li key={c.id} className="rounded-xl border border-borda bg-superficie p-3.5">
      <ConteudoCartao
        slug={slug}
        cartao={c}
        hoje={hoje}
        destinos={destinos(c)}
        aoMover={(p) => mover(c, p)}
        mostrarStatus
      />
    </li>
  );

  const abas = [
    { id: "todas", rotulo: "Todas" },
    { id: "atrasadas", rotulo: `Atrasadas${atrasadasTotal ? ` · ${atrasadasTotal}` : ""}` },
    ...COLUNAS_QUADRO.map((s) => ({ id: s, rotulo: STATUS_OS[s].rotulo })),
  ];
  const listaMobile = filtradas.filter((c) =>
    aba === "todas" ? true : aba === "atrasadas" ? estaAtrasada(c, hoje) : c.status === aba,
  );
  const listaGeral = [...filtradas].sort((a, b) => (a.prazo ?? "9").localeCompare(b.prazo ?? "9"));

  const vazio = (
    <EmptyState
      titulo="Nenhuma OS por aqui"
      descricao={
        modo === "encerradas"
          ? "Ainda não há OS encerradas."
          : "Abra uma nova OS para começar ou ajuste os filtros."
      }
      acoes={
        modo === "aberto" ? (
          <Button asChild>
            <Link href={`/${slug}/os/nova`}>Nova OS</Link>
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 md:max-w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-secundario"
            aria-hidden
          />
          <Input
            type="search"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            placeholder="Cliente, placa, motor ou nº da OS"
            aria-label="Buscar no quadro"
            className="pl-9"
          />
        </div>
        <Select value={filtros.tecnico} onValueChange={(v) => setFiltros({ ...filtros, tecnico: v })}>
          <SelectTrigger className="w-auto min-w-44 rounded-full" aria-label="Filtrar por técnico">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os técnicos</SelectItem>
            <SelectItem value="sem">Sem técnico</SelectItem>
            {tecnicos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filtros.tipo}
          onValueChange={(v) => setFiltros({ ...filtros, tipo: v as FiltrosQuadro["tipo"] })}
        >
          <SelectTrigger className="w-auto min-w-44 rounded-full" aria-label="Filtrar por tipo de cliente">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Lojistas e finais</SelectItem>
            <SelectItem value="lojista">Só lojistas</SelectItem>
            <SelectItem value="final">Só clientes finais</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          aria-pressed={filtros.soAtrasadas}
          onClick={() => setFiltros({ ...filtros, soAtrasadas: !filtros.soAtrasadas })}
          className={cn(
            "h-11 rounded-full border px-4 text-sm",
            filtros.soAtrasadas
              ? "border-perigo bg-perigo-suave font-semibold text-perigo"
              : "border-borda-forte bg-superficie text-texto",
          )}
        >
          Atrasadas · {atrasadasTotal}
        </button>
        {emBancada && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden md:inline-flex"
            aria-label={visao === "quadro" ? "Ver como lista" : "Ver como quadro"}
            onClick={() => setVisao(visao === "quadro" ? "lista" : "quadro")}
          >
            {visao === "quadro" ? <List aria-hidden /> : <LayoutGrid aria-hidden />}
          </Button>
        )}
        <Link
          href={modo === "aberto" ? `/${slug}/os?encerradas=1` : `/${slug}/os`}
          className="inline-flex h-11 items-center text-sm font-medium text-primaria hover:underline"
        >
          {modo === "aberto" ? "Ver encerradas" : "Voltar ao quadro"}
        </Link>
      </div>

      {/* Celular: abas de status + lista */}
      <div className="flex flex-col gap-3 md:hidden">
        {emBancada && (
          <div role="tablist" aria-label="Status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3.5 text-sm font-semibold",
                  aba === a.id
                    ? "border-preto bg-preto text-white"
                    : "border-borda-forte bg-superficie text-texto",
                )}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        )}
        {(emBancada ? listaMobile : listaGeral).length === 0 ? (
          vazio
        ) : (
          <ul className="flex flex-col gap-2.5">{(emBancada ? listaMobile : listaGeral).map(itemLista)}</ul>
        )}
      </div>

      {/* Tablet/desktop */}
      <div className="hidden md:block">
        {modo === "encerradas" || visao === "lista" ? (
          listaGeral.length === 0 ? (
            vazio
          ) : (
            <ul className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-3">{listaGeral.map(itemLista)}</ul>
          )
        ) : (
          <DndContext
            sensors={sensores}
            onDragStart={aoComecar}
            onDragEnd={aoSoltar}
            onDragCancel={() => setAtivo(null)}
          >
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max items-start gap-3.5">
                {colunas.map((col) => (
                  <ColunaSoltavel key={col.status} status={col.status} total={col.cartoes.length}>
                    {col.cartoes.map((c) => (
                      <CartaoArrastavel
                        key={c.id}
                        cartao={c}
                        podeArrastar={destinos(c).length > 0}
                      >
                        <ConteudoCartao
                          slug={slug}
                          cartao={c}
                          hoje={hoje}
                          destinos={destinos(c)}
                          aoMover={(p) => mover(c, p)}
                        />
                      </CartaoArrastavel>
                    ))}
                    {col.cartoes.length === 0 && (
                      <p className="px-2 py-4 text-center text-xs text-texto-secundario">
                        Solte um cartão aqui
                      </p>
                    )}
                  </ColunaSoltavel>
                ))}
              </div>
            </div>
            <DragOverlay>
              {ativo ? (
                <div className="w-64 rotate-1 rounded-[10px] border border-primaria bg-superficie p-3 shadow-lg">
                  <ConteudoCartao slug={slug} cartao={ativo} hoje={hoje} destinos={[]} aoMover={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {rascunhos.length > 0 && modo === "aberto" && (
        <section aria-label="Em recebimento" className="rounded-xl border border-dashed border-borda-forte p-3">
          <h2 className="mb-2 text-sm font-semibold text-texto-secundario">
            Em recebimento (rascunhos) · {rascunhos.length}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {rascunhos.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${slug}/os/${c.id}/recebimento`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-borda bg-superficie px-3 text-sm hover:border-primaria"
                >
                  <span className="font-mono text-xs">{c.numero}</span>
                  <span>{c.clienteNome}</span>
                  <span className="text-primaria">Continuar</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={!!erroMover} onOpenChange={(o) => !o && setErroMover(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Não foi possível mover a OS {erroMover?.numero}</DialogTitle>
            <DialogDescription>O cartão voltou para a coluna anterior.</DialogDescription>
          </DialogHeader>
          <p className="rounded-lg bg-alerta-suave p-3 text-[15px] text-texto" role="alert">
            {erroMover?.msg}
          </p>
          <DialogFooter>
            <Button onClick={() => setErroMover(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
