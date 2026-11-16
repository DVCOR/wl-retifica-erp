"use client";

import * as React from "react";
import { Loader2, Plus, Search, UserRound, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatarTelefone } from "@/lib/format";
import type { ClienteResumo } from "@/lib/recebimento/tipos";
import { clienteRapidoSchema } from "@/lib/validacoes/recebimento";
import {
  buscarClientesAction,
  criarClienteRapidoAction,
} from "@/app/(app)/[empresa]/os/nova/actions";

/**
 * Seleção de cliente do wizard: busca por nome/telefone/documento ou cadastro
 * rápido. Componente interno e isolado: o chefe da operação pode trocá-lo pelo
 * `cliente-rapido` do módulo Clientes mantendo esta interface.
 */
type ClienteBuscaRapidaProps = {
  slug: string;
  aoSelecionar: (cliente: ClienteResumo) => void;
};

export function ClienteBuscaRapida({ slug, aoSelecionar }: ClienteBuscaRapidaProps) {
  const [termo, setTermo] = React.useState("");
  const [resultados, setResultados] = React.useState<ClienteResumo[] | null>(null);
  const [buscando, setBuscando] = React.useState(false);
  const [erroBusca, setErroBusca] = React.useState<string | null>(null);
  const [novo, setNovo] = React.useState(false);
  const sequencia = React.useRef(0);

  React.useEffect(() => {
    const valor = termo.trim();
    const minha = ++sequencia.current;
    const t = setTimeout(async () => {
      if (valor.length < 2) {
        setResultados(null);
        setBuscando(false);
        return;
      }
      setBuscando(true);
      const r = await buscarClientesAction(slug, valor);
      if (minha !== sequencia.current) return; // resposta antiga
      setBuscando(false);
      if (r.ok) {
        setResultados(r.dados);
        setErroBusca(null);
      } else {
        setErroBusca(r.erro);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [termo, slug]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="busca-cliente" className="text-base font-semibold">
          Buscar cliente
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-texto-secundario"
            aria-hidden
          />
          <Input
            id="busca-cliente"
            className="h-14 pl-11 text-base"
            placeholder="Nome, telefone, CPF ou CNPJ"
            autoComplete="off"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
          {buscando && (
            <Loader2
              className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 animate-spin text-texto-secundario"
              aria-hidden
            />
          )}
        </div>
      </div>

      {erroBusca && (
        <p role="alert" className="text-sm font-medium text-perigo">
          {erroBusca}
        </p>
      )}

      {resultados && resultados.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Clientes encontrados">
          {resultados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => aoSelecionar(c)}
                className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-borda bg-superficie px-4 py-2 text-left hover:border-primaria hover:bg-primaria-suave"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutro-suave text-neutro">
                  {c.tipo === "lojista" ? (
                    <Wrench className="size-5" aria-hidden />
                  ) : (
                    <UserRound className="size-5" aria-hidden />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-semibold text-texto">{c.nome}</span>
                  <span className="truncate text-sm text-texto-secundario">
                    {c.nome_fantasia ? `${c.nome_fantasia} · ` : ""}
                    {formatarTelefone(c.telefone_whatsapp)}
                  </span>
                </span>
                <Badge variant={c.tipo === "lojista" ? "info" : "neutro"}>
                  {c.tipo === "lojista" ? "Lojista" : "Cliente final"}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      {resultados && resultados.length === 0 && !buscando && (
        <p className="text-[15px] text-texto-secundario">
          Nenhum cliente com “{termo.trim()}”. Cadastre rapidinho abaixo.
        </p>
      )}

      {!novo ? (
        <Button
          type="button"
          variant="secondary"
          size="bancada"
          className="h-14 w-fit"
          onClick={() => setNovo(true)}
        >
          <Plus aria-hidden />
          Cadastrar cliente novo
        </Button>
      ) : (
        <FormClienteRapido
          slug={slug}
          nomeInicial={termo.trim() && !/^\d+$/.test(termo.trim()) ? termo.trim() : ""}
          aoCriar={aoSelecionar}
          aoCancelar={() => setNovo(false)}
        />
      )}
    </div>
  );
}

function FormClienteRapido({
  slug,
  nomeInicial,
  aoCriar,
  aoCancelar,
}: {
  slug: string;
  nomeInicial: string;
  aoCriar: (cliente: ClienteResumo) => void;
  aoCancelar: () => void;
}) {
  const [tipo, setTipo] = React.useState<"final" | "lojista">("final");
  const [nome, setNome] = React.useState(nomeInicial);
  const [telefone, setTelefone] = React.useState("");
  const [documento, setDocumento] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [erros, setErros] = React.useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = React.useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    const entrada = { tipo, nome, telefone_whatsapp: telefone, documento };
    const v = clienteRapidoSchema.safeParse(entrada);
    if (!v.success) {
      const campos: Record<string, string> = {};
      for (const i of v.error.issues) campos[String(i.path[0])] = i.message;
      setErros(campos);
      return;
    }
    setErros({});
    setSalvando(true);
    const r = await criarClienteRapidoAction(slug, entrada);
    setSalvando(false);
    if (r.ok) aoCriar(r.dados);
    else {
      setErroGeral(r.erro);
      if (r.campos) {
        const campos: Record<string, string> = {};
        for (const [k, v2] of Object.entries(r.campos)) if (v2?.[0]) campos[k] = v2[0];
        setErros(campos);
      }
    }
  }

  return (
    <form
      onSubmit={salvar}
      className="flex flex-col gap-4 rounded-xl border border-borda-forte bg-fundo/60 p-4"
      aria-label="Cadastro rápido de cliente"
    >
      <h3 className="text-base font-bold text-texto">Novo cliente</h3>
      <SegmentedControl
        rotulo="Tipo de cliente"
        tamanho="bancada"
        valor={tipo}
        onValorChange={setTipo}
        className="max-w-md"
        segmentos={[
          { valor: "final", rotulo: "Cliente final" },
          { valor: "lojista", rotulo: "Lojista (oficina)" },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="cr-nome">Nome</Label>
          <Input
            id="cr-nome"
            className="h-12"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            aria-invalid={Boolean(erros.nome)}
          />
          {erros.nome && <p className="text-sm text-perigo">{erros.nome}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cr-tel">WhatsApp (opcional)</Label>
          <Input
            id="cr-tel"
            className="h-12"
            inputMode="tel"
            placeholder="(11) 99999-0000"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            aria-invalid={Boolean(erros.telefone_whatsapp)}
          />
          {erros.telefone_whatsapp && (
            <p className="text-sm text-perigo">{erros.telefone_whatsapp}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cr-doc">CPF ou CNPJ (opcional)</Label>
          <Input
            id="cr-doc"
            className="h-12"
            inputMode="numeric"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            aria-invalid={Boolean(erros.documento)}
          />
          {erros.documento && <p className="text-sm text-perigo">{erros.documento}</p>}
        </div>
      </div>
      {erroGeral && (
        <p role="alert" className="text-sm font-medium text-perigo">
          {erroGeral}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="bancada" className="h-12" disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" aria-hidden />}
          Salvar e continuar
        </Button>
        <Button type="button" variant="ghost" size="bancada" className="h-12" onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
