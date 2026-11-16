"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Package, Pencil, Plus, Power } from "lucide-react";
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
import { toast } from "@/components/ui/sonner";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import { formatarMoeda } from "@/lib/format";
import type { PecaLista } from "@/lib/catalogo/tipos";
import { pecaSchema, type PecaForm } from "@/lib/validacoes/catalogo";
import { alternarAtivoPeca, salvarPeca } from "@/app/(app)/[empresa]/catalogo/actions";
import { BarraFiltro, normalizar } from "./barra-filtro";
import { CampoMoeda } from "./campo-moeda";

export function PecasLista({ pecas }: { pecas: PecaLista[] }) {
  const { empresa } = useEmpresa();
  const { pode, vePrecos } = usePermissao();
  const podeEditar = pode("catalogo.editar");
  const [busca, setBusca] = React.useState("");
  const [inativos, setInativos] = React.useState(false);
  const [editando, setEditando] = React.useState<PecaLista | "nova" | null>(null);
  const [, startTransition] = React.useTransition();

  const filtradas = React.useMemo(() => {
    const termo = normalizar(busca.trim());
    return pecas.filter(
      (p) =>
        (inativos || p.ativo) &&
        (termo === "" ||
          normalizar(`${p.descricao} ${p.codigo ?? ""} ${p.marca ?? ""}`).includes(termo)),
    );
  }, [pecas, busca, inativos]);

  function alternarAtivo(p: PecaLista) {
    startTransition(async () => {
      const r = await alternarAtivoPeca(empresa.slug, { id: p.id, ativo: !p.ativo });
      if (r.ok) toast.success(p.ativo ? "Peça inativada" : "Peça reativada");
      else toast.error(r.erro);
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-texto-secundario">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Controle de estoque chega na próxima fase; por ora o cadastro guarda só custo e preço.
        </p>
        {podeEditar && (
          <Button onClick={() => setEditando("nova")}>
            <Plus aria-hidden /> Nova peça
          </Button>
        )}
      </div>

      {pecas.length === 0 ? (
        <EmptyState
          icone={<Package aria-hidden />}
          titulo="Nenhuma peça cadastrada"
          descricao="Cadastre as peças que a retífica vende (juntas, retentores, bronzinas...) para incluí-las nos orçamentos."
          acoes={
            podeEditar && (
              <Button onClick={() => setEditando("nova")}>
                <Plus aria-hidden /> Nova peça
              </Button>
            )
          }
        />
      ) : (
        <>
          <BarraFiltro
            busca={busca}
            onBuscaChange={setBusca}
            rotulo="Buscar peça"
            placeholder="Buscar por descrição, código ou marca"
            mostrarInativos={inativos}
            onMostrarInativosChange={setInativos}
          />
          {filtradas.length === 0 ? (
            <EmptyState
              titulo="Nada encontrado"
              descricao="Ajuste a busca ou mostre as inativas."
            />
          ) : (
            <Card className="gap-0 divide-y divide-borda py-0">
              {filtradas.map((p) => (
                <div
                  key={p.id}
                  className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <p className={p.ativo ? "font-medium" : "font-medium text-texto-secundario"}>
                      {p.descricao}
                      {!p.ativo && (
                        <Badge variant="contorno" className="ml-2">
                          Inativa
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-texto-secundario">
                      {[p.codigo, p.marca].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Badge variant="neutro">{p.unidade}</Badge>
                  {vePrecos && (
                    <div className="min-w-28 text-right">
                      <p className="font-semibold tabular-nums">{formatarMoeda(p.preco_venda)}</p>
                      {p.custo !== null && (
                        <p className="text-xs text-texto-secundario tabular-nums">
                          custo {formatarMoeda(p.custo)}
                        </p>
                      )}
                    </div>
                  )}
                  {podeEditar && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${p.descricao}`}
                        onClick={() => setEditando(p)}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${p.ativo ? "Inativar" : "Reativar"} ${p.descricao}`}
                        onClick={() => alternarAtivo(p)}
                      >
                        <Power aria-hidden />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {podeEditar && editando && (
        <PecaDialog
          key={editando === "nova" ? "nova" : editando.id}
          peca={editando === "nova" ? null : editando}
          onFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function PecaDialog({ peca, onFechar }: { peca: PecaLista | null; onFechar: () => void }) {
  const { empresa } = useEmpresa();
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  const form = useForm<PecaForm>({
    resolver: zodResolver(pecaSchema),
    defaultValues: {
      codigo: peca?.codigo ?? "",
      descricao: peca?.descricao ?? "",
      marca: peca?.marca ?? "",
      unidade: peca?.unidade ?? "un",
      custo: peca?.custo ?? null,
      preco_venda: peca?.preco_venda ?? 0,
    },
  });

  const onSubmit = (dados: PecaForm) =>
    startTransition(async () => {
      setErro(null);
      const r = await salvarPeca(empresa.slug, peca?.id ?? null, dados);
      if (r.ok) {
        toast.success(peca ? "Peça atualizada" : "Peça cadastrada");
        onFechar();
      } else setErro(r.erro);
    });

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{peca ? "Editar peça" : "Nova peça"}</DialogTitle>
          <DialogDescription>
            O custo é interno; o cliente só vê o preço de venda.
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
              name="descricao"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Descrição</FormLabel>
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
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="un, jg, kg…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="hidden sm:block" />
            <FormField
              control={form.control}
              name="custo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo (opcional)</FormLabel>
                  <FormControl>
                    <CampoMoeda
                      valor={field.value ?? null}
                      onValorChange={field.onChange}
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
              name="preco_venda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço de venda</FormLabel>
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
