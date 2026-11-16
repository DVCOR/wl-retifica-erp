"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Form, FormControl, FormErro, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { dadosEmpresaSchema, type DadosEmpresa } from "@/lib/validacoes/empresa";
import { useEmpresa } from "@/lib/auth/empresa-context";
import { atualizarDadosEmpresa } from "./actions";

const CAMPOS: { nome: keyof DadosEmpresa; rotulo: string; tipo?: string; autoComplete?: string }[] = [
  { nome: "nome_fantasia", rotulo: "Nome fantasia", autoComplete: "organization" },
  { nome: "razao_social", rotulo: "Razão social" },
  { nome: "telefone", rotulo: "Telefone / WhatsApp", tipo: "tel", autoComplete: "tel" },
  { nome: "email", rotulo: "E-mail", tipo: "email", autoComplete: "email" },
];

/** Formulário de exemplo: react-hook-form + zod (mesmo schema da action) + Server Action. */
export function FormDadosEmpresa({ inicial }: { inicial: DadosEmpresa }) {
  const { empresa } = useEmpresa();
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  const form = useForm<DadosEmpresa>({ resolver: zodResolver(dadosEmpresaSchema), defaultValues: inicial });

  const onSubmit = (dados: DadosEmpresa) =>
    startTransition(async () => {
      setErro(null);
      const r = await atualizarDadosEmpresa(empresa.slug, dados);
      if (r.ok) {
        toast.success("Dados da empresa salvos");
        form.reset(dados);
      } else {
        setErro(r.erro);
      }
    });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        {CAMPOS.map((c) => (
          <FormField
            key={c.nome}
            control={form.control}
            name={c.nome}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{c.rotulo}</FormLabel>
                <FormControl>
                  <Input type={c.tipo ?? "text"} autoComplete={c.autoComplete} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <div className="grid gap-3 sm:col-span-2">
          <FormErro mensagem={erro} />
          <div>
            <Button type="submit" disabled={pendente || !form.formState.isDirty}>
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
