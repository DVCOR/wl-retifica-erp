"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useEmpresa } from "@/lib/auth/empresa-context";
import { tabelaPrecoSchema, type TabelaPrecoForm } from "@/lib/validacoes/catalogo";
import { salvarTabelaPreco } from "@/app/(app)/[empresa]/catalogo/actions";

export type TabelaEditavel = {
  id: string;
  nome: string;
  desconto_padrao_pct: number;
  padrao_para: "lojista" | "final" | null;
};

const SEM_PADRAO = "nenhum";

/** Cria/edita nome, desconto padrão e a que tipo de cliente a tabela se aplica por padrão. */
export function TabelaDialog({
  tabela,
  onFechar,
  aoSalvar,
}: {
  tabela: TabelaEditavel | null;
  onFechar: () => void;
  aoSalvar?: (id: string) => void;
}) {
  const { empresa } = useEmpresa();
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  const form = useForm<TabelaPrecoForm>({
    resolver: zodResolver(tabelaPrecoSchema),
    defaultValues: {
      nome: tabela?.nome ?? "",
      desconto_padrao_pct: tabela?.desconto_padrao_pct ?? 0,
      padrao_para: tabela?.padrao_para ?? null,
    },
  });

  const onSubmit = (dados: TabelaPrecoForm) =>
    startTransition(async () => {
      setErro(null);
      const r = await salvarTabelaPreco(empresa.slug, tabela?.id ?? null, dados);
      if (r.ok) {
        toast.success(tabela ? "Tabela atualizada" : "Tabela criada");
        aoSalvar?.(r.dados.id);
        onFechar();
      } else setErro(r.erro);
    });

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tabela ? "Editar tabela de preço" : "Nova tabela de preço"}</DialogTitle>
          <DialogDescription>
            O desconto vale para todos os itens sem preço próprio na tabela.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} autoFocus placeholder="Lojista" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="desconto_padrao_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desconto padrão (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="0.01"
                      name={field.name}
                      onBlur={field.onBlur}
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="padrao_para"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Padrão para</FormLabel>
                  <Select
                    value={field.value ?? SEM_PADRAO}
                    onValueChange={(v) => field.onChange(v === SEM_PADRAO ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SEM_PADRAO}>Nenhum (só clientes escolhidos)</SelectItem>
                      <SelectItem value="lojista">Clientes lojistas</SelectItem>
                      <SelectItem value="final">Clientes finais</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Só uma tabela é a padrão de cada tipo; escolher aqui substitui a atual.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormErro mensagem={erro} />
            <DialogFooter className="gap-2">
              <Button type="button" variant="secondary" onClick={onFechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
