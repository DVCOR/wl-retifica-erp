"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEmpresa } from "@/lib/auth/empresa-context";
import { formatarDocumento, formatarTelefone } from "@/lib/format";
import { ROTULO_TIPO_CLIENTE } from "@/lib/validacoes/clientes";
import type { ClienteResumoBusca } from "@/lib/data/clientes";
import { buscarClientesAcao } from "@/app/(app)/[empresa]/clientes/actions";
import { ClienteRapido } from "./cliente-rapido";

type Props = {
  valor: { id: string; nome: string } | null;
  onSelecionado: (cliente: { id: string; nome: string } | null) => void;
  /** Permite cadastrar um cliente novo sem sair da tela (padrão: true). */
  permitirCriar?: boolean;
  rotulo?: string;
  id?: string;
};

/** Busca de cliente por nome, documento ou telefone (com cadastro rápido opcional). */
export function SeletorCliente({
  valor,
  onSelecionado,
  permitirCriar = true,
  rotulo = "Cliente",
  id,
}: Props) {
  const { empresa } = useEmpresa();
  const [termo, setTermo] = React.useState("");
  const [resultado, setResultado] = React.useState<{
    termo: string;
    lista: ClienteResumoBusca[];
  } | null>(null);
  const lista = resultado?.lista ?? [];
  const buscando = resultado?.termo !== termo;
  const [criando, setCriando] = React.useState(false);

  React.useEffect(() => {
    if (valor || criando) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      const r = await buscarClientesAcao(empresa.slug, termo);
      if (cancelado) return;
      setResultado({ termo, lista: r.ok ? r.dados : [] });
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [termo, valor, criando, empresa.slug]);

  if (valor) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-borda-forte bg-superficie px-3">
        <span className="truncate text-[15px] font-medium">{valor.nome}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onSelecionado(null)}>
          <X aria-hidden /> Trocar
        </Button>
      </div>
    );
  }

  if (criando) {
    return (
      <div className="rounded-lg border border-borda p-4">
        <ClienteRapido
          nomeInicial={termo}
          onCancelar={() => setCriando(false)}
          onCriado={(c) => {
            setCriando(false);
            onSelecionado({ id: c.id, nome: c.nome });
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <label className="relative block">
        <span className="sr-only">{rotulo}</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-texto-secundario"
          aria-hidden
        />
        <Input
          id={id}
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar por nome, CPF/CNPJ ou telefone"
          className="pl-10"
          autoComplete="off"
        />
      </label>
      <ul
        className="grid max-h-64 gap-1 overflow-y-auto"
        aria-label="Clientes encontrados"
        aria-busy={buscando}
      >
        {lista.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelecionado({ id: c.id, nome: c.nome })}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-borda bg-superficie px-3 py-2 text-left hover:bg-fundo"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{c.nome}</span>
                <span className="block truncate text-sm text-texto-secundario">
                  {[
                    c.documento && formatarDocumento(c.documento),
                    c.telefone_whatsapp && formatarTelefone(c.telefone_whatsapp),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem documento ou telefone"}
                </span>
              </span>
              <Badge variant={c.tipo === "lojista" ? "info" : "neutro"}>
                {ROTULO_TIPO_CLIENTE[c.tipo]}
              </Badge>
            </button>
          </li>
        ))}
        {!buscando && lista.length === 0 && (
          <li className="px-1 py-2 text-sm text-texto-secundario">Nenhum cliente encontrado.</li>
        )}
      </ul>
      {permitirCriar && (
        <Button type="button" variant="outline" onClick={() => setCriando(true)}>
          Cadastrar cliente novo{termo ? ` “${termo}”` : ""}
        </Button>
      )}
    </div>
  );
}
