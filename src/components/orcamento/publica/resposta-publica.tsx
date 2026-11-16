"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { responderPublicoAction } from "@/app/os-publica/[token]/actions";

/** Nome + Aprovar / Não aprovar (prototipo OSPublica). */
export function RespostaPublica({ token }: { token: string }) {
  const [nome, setNome] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, executar] = React.useTransition();

  function responder(aprovar: boolean) {
    setErro(null);
    if (nome.trim().length < 2) {
      setErro("Informe seu nome para registrar a resposta.");
      document.getElementById("nome-resposta")?.focus();
      return;
    }
    if (!aprovar && !window.confirm("Confirma que não deseja aprovar este orçamento?")) return;
    executar(async () => {
      const r = await responderPublicoAction(token, { aprovar, nome });
      if (!r.ok) setErro(r.campos ? Object.values(r.campos).flat().filter(Boolean).join(" ") : r.erro);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-superficie p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome-resposta" className="text-sm font-semibold">
          Seu nome
        </Label>
        <Input
          id="nome-resposta"
          className="h-12 rounded-[10px] text-base"
          placeholder="Nome de quem está aprovando"
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      {erro && (
        <p role="alert" className="text-sm font-medium text-perigo">
          {erro}
        </p>
      )}
      <button
        type="button"
        disabled={pendente}
        onClick={() => responder(true)}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-sucesso text-[17px] font-bold text-white disabled:opacity-60"
      >
        {pendente && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Aprovar orçamento
      </button>
      <button
        type="button"
        disabled={pendente}
        onClick={() => responder(false)}
        className="h-12 rounded-xl border border-borda-forte bg-superficie text-[15px] font-semibold text-texto disabled:opacity-60"
      >
        Não aprovar
      </button>
    </section>
  );
}
