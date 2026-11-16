"use client";

import * as React from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
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
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import {
  clienteSchema,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
  ROTULO_TIPO_CLIENTE,
  somenteDigitos,
  type ClienteEntrada,
  type Pessoa,
} from "@/lib/validacoes/clientes";
import type { ClienteCompleto, TabelaPrecoOpcao } from "@/lib/data/clientes";
import { atualizarCliente, criarCliente } from "@/app/(app)/[empresa]/clientes/actions";
import { CampoTexto } from "./campo-texto";

type Props = {
  /** Cliente existente (edição); ausente = novo. */
  inicial?: ClienteCompleto;
  tabelas: TabelaPrecoOpcao[];
  onSalvo?: (id: string) => void;
  onCancelar?: () => void;
};

const SEM_TABELA = "__padrao";

function pessoaInicial(documento: string | null): Pessoa {
  return somenteDigitos(documento).length === 11 ? "pf" : "pj";
}

function formatarNumero(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v).replace(".", ",");
}

function valoresIniciais(c?: ClienteCompleto): ClienteEntrada {
  const e = (c?.endereco ?? {}) as Record<string, string | undefined>;
  const pessoa = pessoaInicial(c?.documento ?? null);
  return {
    tipo: c?.tipo ?? "final",
    pessoa: c ? pessoa : "pf",
    nome: c?.nome ?? "",
    nome_fantasia: c?.nome_fantasia ?? "",
    documento: c?.documento ? mascararDocumento(c.documento, pessoa) : "",
    ie: c?.ie ?? "",
    telefone_whatsapp: c?.telefone_whatsapp ? mascararTelefone(c.telefone_whatsapp) : "",
    email: c?.email ?? "",
    endereco: {
      cep: e.cep ? mascararCep(e.cep) : "",
      logradouro: e.logradouro ?? "",
      numero: e.numero ?? "",
      complemento: e.complemento ?? "",
      bairro: e.bairro ?? "",
      cidade: e.cidade ?? "",
      uf: e.uf ?? "",
    },
    tabela_preco_id: c?.tabela_preco_id ?? "",
    limite_credito: formatarNumero(c?.limite_credito),
    condicao_pagamento: c?.condicao_pagamento ?? "",
    dia_fechamento: formatarNumero(c?.dia_fechamento),
    observacoes: c?.observacoes ?? "",
    ativo: c?.ativo ?? true,
  };
}

/** Cadastro/edição completa de cliente (react-hook-form + zod + Server Action). */
export function FormCliente({ inicial, tabelas, onSalvo, onCancelar }: Props) {
  const { empresa } = useEmpresa();
  const { pode, vePrecos } = usePermissao();
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();

  const edicao = !!inicial;
  // Financeiro edita só os dados financeiros (o banco também restringe).
  const apenasFinanceiro = edicao && !pode("clientes.editar");

  const form = useForm<ClienteEntrada>({
    resolver: zodResolver(clienteSchema) as unknown as Resolver<ClienteEntrada>,
    defaultValues: valoresIniciais(inicial),
  });
  const tipo = useWatch({ control: form.control, name: "tipo" });
  const pessoa = useWatch({ control: form.control, name: "pessoa" }) ?? "pj";

  const enviar = () =>
    startTransition(async () => {
      setErro(null);
      const valores = form.getValues();
      const r = inicial
        ? await atualizarCliente(empresa.slug, inicial.id, valores)
        : await criarCliente(empresa.slug, valores);
      if (r.ok) {
        toast.success(inicial ? "Cliente atualizado" : "Cliente cadastrado");
        onSalvo?.(inicial ? inicial.id : (r.dados as { id: string }).id);
      } else {
        setErro(r.erro);
        for (const [campo, msgs] of Object.entries(r.campos ?? {})) {
          const m = msgs?.[0];
          if (m && campo !== "_") form.setError(campo as keyof ClienteEntrada, { message: m });
        }
      }
    });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(enviar)}
        className="grid gap-6"
        noValidate
        aria-label={edicao ? "Editar cliente" : "Novo cliente"}
      >
        <fieldset disabled={apenasFinanceiro} className="grid gap-4">
          <legend className="mb-1 text-sm font-semibold text-texto-secundario">
            Identificação
          </legend>
          {apenasFinanceiro && (
            <p className="rounded-lg bg-info-suave px-3 py-2.5 text-sm text-info">
              Seu papel altera apenas tabela de preço, limite, condição de pagamento e fechamento.
            </p>
          )}
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de cliente</FormLabel>
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
          <FormField
            control={form.control}
            name="pessoa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pessoa</FormLabel>
                <SegmentedControl
                  rotulo="Pessoa física ou jurídica"
                  valor={(field.value ?? "pj") as Pessoa}
                  onValorChange={(v) => {
                    field.onChange(v);
                    form.setValue(
                      "documento",
                      mascararDocumento(form.getValues("documento") ?? "", v),
                    );
                    form.clearErrors("documento");
                  }}
                  segmentos={[
                    { valor: "pf", rotulo: "Física (CPF)" },
                    { valor: "pj", rotulo: "Jurídica (CNPJ)" },
                  ]}
                />
              </FormItem>
            )}
          />
          <CampoTexto
            control={form.control}
            name="nome"
            rotulo={pessoa === "pj" ? "Razão social / nome" : "Nome completo"}
            autoComplete="off"
            maxLength={160}
          />
          {pessoa === "pj" && (
            <CampoTexto
              control={form.control}
              name="nome_fantasia"
              rotulo="Nome fantasia"
              maxLength={160}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              control={form.control}
              name="documento"
              rotulo={pessoa === "pf" ? "CPF" : "CNPJ"}
              inputMode="numeric"
              mascara={(v) => mascararDocumento(v, pessoa)}
              placeholder={pessoa === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
            />
            {pessoa === "pj" && (
              <CampoTexto
                control={form.control}
                name="ie"
                rotulo="Inscrição estadual"
                maxLength={30}
              />
            )}
          </div>
        </fieldset>

        <fieldset disabled={apenasFinanceiro} className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-semibold text-texto-secundario sm:col-span-2">
            Contato
          </legend>
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
          <CampoTexto
            control={form.control}
            name="email"
            rotulo="E-mail"
            type="email"
            inputMode="email"
            autoComplete="off"
          />
        </fieldset>

        <fieldset disabled={apenasFinanceiro} className="grid gap-4 sm:grid-cols-6">
          <legend className="mb-3 text-sm font-semibold text-texto-secundario sm:col-span-6">
            Endereço
          </legend>
          <CampoTexto
            control={form.control}
            name="endereco.cep"
            rotulo="CEP"
            inputMode="numeric"
            mascara={mascararCep}
            placeholder="00000-000"
            className="sm:col-span-2"
          />
          <CampoTexto
            control={form.control}
            name="endereco.logradouro"
            rotulo="Rua / avenida"
            className="sm:col-span-4"
          />
          <CampoTexto
            control={form.control}
            name="endereco.numero"
            rotulo="Número"
            className="sm:col-span-2"
          />
          <CampoTexto
            control={form.control}
            name="endereco.complemento"
            rotulo="Complemento"
            className="sm:col-span-4"
          />
          <CampoTexto
            control={form.control}
            name="endereco.bairro"
            rotulo="Bairro"
            className="sm:col-span-2"
          />
          <CampoTexto
            control={form.control}
            name="endereco.cidade"
            rotulo="Cidade"
            className="sm:col-span-3"
          />
          <CampoTexto
            control={form.control}
            name="endereco.uf"
            rotulo="UF"
            maxLength={2}
            mascara={(v) => v.toUpperCase().replace(/[^A-Z]/g, "")}
            className="sm:col-span-1"
          />
        </fieldset>

        {vePrecos && (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold text-texto-secundario sm:col-span-2">
              Preço e pagamento
            </legend>
            <FormField
              control={form.control}
              name="tabela_preco_id"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Tabela de preço</FormLabel>
                  <Select
                    value={field.value ? field.value : SEM_TABELA}
                    onValueChange={(v) => field.onChange(v === SEM_TABELA ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SEM_TABELA}>Padrão do tipo de cliente</SelectItem>
                      {tabelas.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Sem escolha, vale a tabela padrão de {tipo === "lojista" ? "lojista" : "balcão"}
                    .
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CampoTexto
              control={form.control}
              name="limite_credito"
              rotulo="Limite de crédito (R$)"
              inputMode="decimal"
              placeholder="0,00"
            />
            <CampoTexto
              control={form.control}
              name="condicao_pagamento"
              rotulo="Condição de pagamento"
              placeholder={
                tipo === "lojista" ? "Ex.: faturado, boleto 15 dias" : "Ex.: à vista, Pix"
              }
              maxLength={80}
            />
            {tipo === "lojista" && (
              <CampoTexto
                control={form.control}
                name="dia_fechamento"
                rotulo="Dia de fechamento"
                inputMode="numeric"
                maxLength={2}
                mascara={(v) => v.replace(/\D/g, "")}
                placeholder="1 a 31"
                ajuda="Dia do mês em que a fatura do lojista fecha."
              />
            )}
          </fieldset>
        )}

        <fieldset disabled={apenasFinanceiro} className="grid gap-4">
          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    maxLength={2000}
                    placeholder="Combinados, restrições, preferências de contato…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {edicao && (
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <Checkbox
                    id="cliente-ativo"
                    checked={field.value ?? true}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  <Label htmlFor="cliente-ativo" className="cursor-pointer">
                    Cliente ativo
                  </Label>
                </FormItem>
              )}
            />
          )}
        </fieldset>

        <div className="grid gap-3">
          <FormErro mensagem={erro} />
          <div className="flex flex-wrap justify-end gap-2">
            {onCancelar && (
              <Button type="button" variant="outline" onClick={onCancelar} disabled={pendente}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : edicao ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
