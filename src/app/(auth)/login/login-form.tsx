"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormErro, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { loginLinkSchema, loginSenhaSchema } from "@/lib/validacoes/auth";
import { entrarComSenha, enviarLinkMagico } from "./actions";

type DadosSenha = z.input<typeof loginSenhaSchema>;
type DadosLink = z.input<typeof loginLinkSchema>;

export function LoginForm({ proximo }: { proximo?: string }) {
  return (
    <Tabs defaultValue="senha">
      <TabsList className="mb-2">
        <TabsTrigger value="senha" className="flex-1 justify-center">
          <KeyRound className="size-4" aria-hidden />
          Senha
        </TabsTrigger>
        <TabsTrigger value="link" className="flex-1 justify-center">
          <Mail className="size-4" aria-hidden />
          Link por e-mail
        </TabsTrigger>
      </TabsList>
      <TabsContent value="senha">
        <FormSenha proximo={proximo} />
      </TabsContent>
      <TabsContent value="link">
        <FormLink proximo={proximo} />
      </TabsContent>
    </Tabs>
  );
}

function FormSenha({ proximo }: { proximo?: string }) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  const form = useForm<DadosSenha>({
    resolver: zodResolver(loginSenhaSchema),
    defaultValues: { email: "", senha: "", proximo },
  });

  const onSubmit = (dados: DadosSenha) =>
    startTransition(async () => {
      setErro(null);
      const r = await entrarComSenha(dados);
      if (r && !r.ok) setErro(r.erro);
    });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="senha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormErro mensagem={erro} />
        <Button type="submit" size="lg" disabled={pendente} className="w-full">
          {pendente ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Form>
  );
}

function FormLink({ proximo }: { proximo?: string }) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviado, setEnviado] = React.useState(false);
  const [pendente, startTransition] = React.useTransition();
  const form = useForm<DadosLink>({ resolver: zodResolver(loginLinkSchema), defaultValues: { email: "", proximo } });

  const onSubmit = (dados: DadosLink) =>
    startTransition(async () => {
      setErro(null);
      const r = await enviarLinkMagico(dados);
      if (r.ok) setEnviado(true);
      else setErro(r.erro);
    });

  if (enviado) {
    return (
      <p role="status" className="rounded-lg bg-sucesso-suave px-4 py-3 text-[15px] text-sucesso">
        Se este e-mail tiver acesso, enviamos um link para entrar. Abra no mesmo aparelho.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormErro mensagem={erro} />
        <Button type="submit" size="lg" disabled={pendente} className="w-full">
          {pendente ? "Enviando…" : "Enviar link de acesso"}
        </Button>
      </form>
    </Form>
  );
}
