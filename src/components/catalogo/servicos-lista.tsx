"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Power, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Form,
  FormControl,
  FormErro,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import { formatarMoeda } from "@/lib/format";
import {
  ROTULO_UNIDADE,
  ROTULO_UNIDADE_CURTO,
  UNIDADES_SERVICO,
  type UnidadeServico,
} from "@/lib/catalogo/calculos";
import type { ServicoLista } from "@/lib/catalogo/tipos";
import { servicoSchema, type ServicoForm } from "@/lib/validacoes/catalogo";
import { alternarAtivoServico, salvarServico } from "@/app/(app)/[empresa]/catalogo/actions";
import { BarraFiltro, normalizar } from "./barra-filtro";
import { CampoMoeda } from "./campo-moeda";

const SEM_CATEGORIA = "Sem categoria";

function formatarTempo(min: number | null): string | null {
  if (min === null) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function ServicosLista({ servicos }: { servicos: ServicoLista[] }) {
  const { empresa } = useEmpresa();
  const { pode, vePrecos } = usePermissao();
  const podeEditar = pode("catalogo.editar");
  const [busca, setBusca] = React.useState("");
  const [inativos, setInativos] = React.useState(false);
  const [editando, setEditando] = React.useState<ServicoLista | "novo" | null>(null);
  const [, startTransition] = React.useTransition();

  const categorias = React.useMemo(
    () => [...new Set(servicos.map((s) => s.categoria).filter((c): c is string => !!c))].sort(),
    [servicos],
  );

  const grupos = React.useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtrados = servicos.filter(
      (s) =>
        (inativos || s.ativo) &&
        (termo === "" ||
          normalizar(`${s.nome} ${s.codigo ?? ""} ${s.categoria ?? ""}`).includes(termo)),
    );
    const mapa = new Map<string, ServicoLista[]>();
    for (const s of filtrados) {
      const chave = s.categoria ?? SEM_CATEGORIA;
      mapa.set(chave, [...(mapa.get(chave) ?? []), s]);
    }
    return [...mapa.entries()].sort(([a], [b]) =>
      a === SEM_CATEGORIA ? 1 : b === SEM_CATEGORIA ? -1 : a.localeCompare(b, "pt-BR"),
    );
  }, [servicos, busca, inativos]);

  function alternarAtivo(s: ServicoLista) {
    startTransition(async () => {
      const r = await alternarAtivoServico(empresa.slug, { id: s.id, ativo: !s.ativo });
      if (r.ok) toast.success(s.ativo ? "Serviço inativado" : "Serviço reativado");
      else toast.error(r.erro);
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[15px] text-texto-secundario">
          {vePrecos
            ? "Preços base; as tabelas aplicam desconto ou preço próprio."
            : "Lista sem preços."}
        </p>
        {podeEditar && (
          <Button onClick={() => setEditando("novo")}>
            <Plus aria-hidden /> Novo serviço
          </Button>
        )}
      </div>

      {servicos.length === 0 ? (
        <EmptyState
          icone={<Wrench aria-hidden />}
          titulo="Nenhum serviço cadastrado"
          descricao="Cadastre os serviços da retífica (plainar, brunir, retificar...) para usar nos orçamentos."
          acoes={
            podeEditar && (
              <Button onClick={() => setEditando("novo")}>
                <Plus aria-hidden /> Novo serviço
              </Button>
            )
          }
        />
      ) : (
        <>
          <BarraFiltro
            busca={busca}
            onBuscaChange={setBusca}
            rotulo="Buscar serviço"
            placeholder="Buscar por nome, código ou categoria"
            mostrarInativos={inativos}
            onMostrarInativosChange={setInativos}
          />
          {grupos.length === 0 ? (
            <EmptyState
              titulo="Nada encontrado"
              descricao="Ajuste a busca ou mostre os inativos."
            />
          ) : (
            <div className="grid gap-4">
              {grupos.map(([categoria, itens]) => (
                <section key={categoria} aria-labelledby={`cat-${categoria}`}>
                  <h2
                    id={`cat-${categoria}`}
                    className="mb-2 px-1 text-xs font-semibold tracking-wide text-texto-secundario uppercase"
                  >
                    {categoria} <span className="font-normal">({itens.length})</span>
                  </h2>
                  <Card className="gap-0 divide-y divide-borda py-0">
                    {itens.map((s) => (
                      <div
                        key={s.id}
                        className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1 basis-56">
                          <p
                            className={
                              s.ativo ? "font-medium" : "font-medium text-texto-secundario"
                            }
                          >
                            {s.nome}
                            {!s.ativo && (
                              <Badge variant="contorno" className="ml-2">
                                Inativo
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-texto-secundario">
                            {[s.codigo, formatarTempo(s.tempo_padrao_min)]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                        <Badge variant="neutro">{ROTULO_UNIDADE[s.unidade]}</Badge>
                        {vePrecos && (
                          <p className="min-w-28 text-right font-semibold tabular-nums">
                            {formatarMoeda(s.preco_base)}
                            {s.unidade !== "un" && (
                              <span className="block text-xs font-normal text-texto-secundario">
                                por {ROTULO_UNIDADE_CURTO[s.unidade]}
                              </span>
                            )}
                          </p>
                        )}
                        {podeEditar && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${s.nome}`}
                              onClick={() => setEditando(s)}
                            >
                              <Pencil aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${s.ativo ? "Inativar" : "Reativar"} ${s.nome}`}
                              onClick={() => alternarAtivo(s)}
                            >
                              <Power aria-hidden />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </Card>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {podeEditar && editando && (
        <ServicoDialog
          key={editando === "novo" ? "novo" : editando.id}
          servico={editando === "novo" ? null : editando}
          categorias={categorias}
          onFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function ServicoDialog({
  servico,
  categorias,
  onFechar,
}: {
  servico: ServicoLista | null;
  categorias: string[];
  onFechar: () => void;
}) {
  const { empresa } = useEmpresa();
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  const form = useForm<ServicoForm>({
    resolver: zodResolver(servicoSchema),
    defaultValues: {
      codigo: servico?.codigo ?? "",
      nome: servico?.nome ?? "",
      categoria: servico?.categoria ?? "",
      unidade: servico?.unidade ?? "un",
      preco_base: servico?.preco_base ?? 0,
      tempo_padrao_min: servico?.tempo_padrao_min ?? null,
    },
  });

  const onSubmit = (dados: ServicoForm) =>
    startTransition(async () => {
      setErro(null);
      const r = await salvarServico(empresa.slug, servico?.id ?? null, dados);
      if (r.ok) {
        toast.success(servico ? "Serviço atualizado" : "Serviço cadastrado");
        onFechar();
      } else setErro(r.erro);
    });

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{servico ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>
            Preço base e tempo padrão servem de partida para os orçamentos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="CAB-FACE" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      list="categorias-servico"
                      placeholder="Cabeçote, Bloco, Virabrequim…"
                    />
                  </FormControl>
                  <datalist id="categorias-servico">
                    {categorias.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cobrado por</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNIDADES_SERVICO.map((u: UnidadeServico) => (
                        <SelectItem key={u} value={u}>
                          {ROTULO_UNIDADE[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preco_base"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço base</FormLabel>
                  <FormControl>
                    <CampoMoeda
                      valor={field.value || null}
                      onValorChange={(v) => field.onChange(v ?? 0)}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tempo_padrao_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tempo padrão (minutos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      name={field.name}
                      onBlur={field.onBlur}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:col-span-2">
              <FormErro mensagem={erro} />
              <DialogFooter className="gap-2">
                <Button type="button" variant="secondary" onClick={onFechar}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pendente}>
                  {pendente ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
