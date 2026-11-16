"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErro } from "@/components/ui/form";
import { aceitarConvite, enviarLinkConvite } from "./actions";

export function AceitarConvite({
  token,
  nomeSugerido,
}: {
  token: string;
  nomeSugerido?: string | null;
}) {
  const [nome, setNome] = React.useState(nomeSugerido ?? "");
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setErro(null);
          const r = await aceitarConvite({ token, nome });
          if (r && !r.ok) setErro(r.erro);
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          maxLength={80}
        />
      </div>
      <FormErro mensagem={erro} />
      <Button type="submit" size="lg" disabled={pendente}>
        {pendente ? "Entrando…" : "Aceitar convite"}
      </Button>
    </form>
  );
}

export function EnviarLinkConvite({ token, email }: { token: string; email: string }) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviado, setEnviado] = React.useState(false);
  const [pendente, startTransition] = React.useTransition();
  if (enviado) {
    return (
      <p role="status" className="rounded-lg bg-sucesso-suave px-4 py-3 text-[15px] text-sucesso">
        Enviamos um link para <strong>{email}</strong>. Abra-o neste aparelho para continuar.
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      <FormErro mensagem={erro} />
      <Button
        size="lg"
        disabled={pendente}
        onClick={() =>
          startTransition(async () => {
            setErro(null);
            const r = await enviarLinkConvite({ token });
            if (r.ok) setEnviado(true);
            else setErro(r.erro);
          })
        }
      >
        {pendente ? "Enviando…" : `Receber link em ${email}`}
      </Button>
    </div>
  );
}
