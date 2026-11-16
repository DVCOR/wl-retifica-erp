"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/sonner";
import { Form, FormErro, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEmpresa } from "@/lib/auth/empresa-context";
import {
  clienteRapidoSchema,
  mascararTelefone,
  ROTULO_TIPO_CLIENTE,
  type ClienteRapidoEntrada,
  type TipoCliente,
} from "@/lib/validacoes/clientes";
import { criarClienteRapido, type ClienteCriado } from "@/app/(app)/[empresa]/clientes/actions";
import { CampoTexto } from "./campo-texto";

export type ClienteRapidoCriado = ClienteCriado;

type Props = {
  /** Chamado com o cliente recém-criado. */
  onCriado: (cliente: ClienteRapidoCriado) => void;
  onCancelar?: () => void;
  /** Nome já digitado na busca, para pré-preencher. */
  nomeInicial?: string;
  /** Tipo sugerido (padrão: cliente final). */
  tipoInicial?: TipoCliente;
};

/**
 * Cadastro rápido de cliente (nome, tipo, WhatsApp) — usado no wizard de Nova OS.
 * Não navega: devolve o cliente criado em `onCriado`.
 */
export function ClienteRapido({
  onCriado,
  onCancelar,
  nomeInicial = "",
  tipoInicial = "final",
}: Props) {
  const { empresa } = useEmpresa();
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  const form = useForm<ClienteRapidoEntrada>({
    resolver: zodResolver(clienteRapidoSchema) as unknown as Resolver<ClienteRapidoEntrada>,
    defaultValues: { nome: nomeInicial, tipo: tipoInicial, telefone_whatsapp: "" },
  });

  const enviar = (valores: ClienteRapidoEntrada) =>
    startTransition(async () => {
      setErro(null);
      const r = await criarClienteRapido(empresa.slug, valores);
      if (r.ok) {
        toast.success("Cliente cadastrado");
        onCriado(r.dados);
      } else {
        setErro(r.erro);
      }
    });

  return (
    <Form {...form}>
      <form
        // Pode estar dentro de outro <form> (wizard): evita submit/bolha duplicados.
        onSubmit={(e) => {
          e.stopPropagation();
          void form.handleSubmit(enviar)(e);
        }}
        className="grid gap-4"
        noValidate
        aria-label="Cadastro rápido de cliente"
      >
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <SegmentedControl
                rotulo="Tipo de cliente"
                valor={field.value ?? "final"}
                onValorChange={field.onChange}
                segmentos={[
                  { valor: "final", rotulo: ROTULO_TIPO_CLIENTE.final },
                  { valor: "lojista", rotulo: ROTULO_TIPO_CLIENTE.lojista, tom: "info" },
                ]}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <CampoTexto
          control={form.control}
          name="nome"
          rotulo="Nome"
          autoComplete="off"
          maxLength={160}
        />
        <CampoTexto
          control={form.control}
          name="telefone_whatsapp"
          rotulo="WhatsApp"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          mascara={mascararTelefone}
          placeholder="(00) 00000-0000"
        />
        <FormErro mensagem={erro} />
        <div className="flex flex-wrap justify-end gap-2">
          {onCancelar && (
            <Button type="button" variant="outline" onClick={onCancelar} disabled={pendente}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Cadastrar e usar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
