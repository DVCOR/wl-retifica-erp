"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEmpresa, usePermissao } from "@/lib/auth/empresa-context";
import { formatarPlaca } from "@/lib/format";
import { descricaoMotor } from "@/lib/validacoes/motores";
import type { MotorResumo } from "@/lib/data/motores";
import { buscarMotoresAcao } from "@/app/(app)/[empresa]/motores/actions";
import { FormMotor } from "./form-motor";

export type MotorSelecionado = MotorResumo;

type Props = {
  /** Cliente da OS: seus motores aparecem primeiro e o novo motor nasce vinculado a ele. */
  clienteId?: string | null;
  clienteNome?: string | null;
  /** Chamado ao escolher um motor existente ou criar um novo. */
  onSelecionado: (motor: MotorSelecionado) => void;
  /** Motor já escolhido (mostra resumo + "Trocar"). */
  valor?: MotorSelecionado | null;
  onLimpar?: () => void;
};

/**
 * Seletor de motor para o wizard de Nova OS: busca por marca, modelo, código,
 * nº de série ou placa — ou cadastra um motor novo para o cliente.
 */
export function SeletorMotor({ clienteId, clienteNome, onSelecionado, valor, onLimpar }: Props) {
  const { empresa } = useEmpresa();
  const { pode } = usePermissao();
  const [termo, setTermo] = React.useState("");
  const chave = `${clienteId ?? ""}|${termo}`;
  const [resultado, setResultado] = React.useState<{ chave: string; lista: MotorResumo[] } | null>(
    null,
  );
  const lista = resultado?.lista ?? [];
  const buscando = resultado?.chave !== chave;
  const [criando, setCriando] = React.useState(false);

  React.useEffect(() => {
    if (valor || criando) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      const r = await buscarMotoresAcao(empresa.slug, { termo, clienteId: clienteId ?? null });
      if (cancelado) return;
      setResultado({ chave, lista: r.ok ? r.dados : [] });
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [termo, clienteId, chave, valor, criando, empresa.slug]);

  if (valor) {
    return (
      <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg border border-borda-forte bg-superficie px-3 py-2">
        <ResumoMotor motor={valor} />
        {onLimpar && (
          <Button type="button" variant="ghost" size="sm" onClick={onLimpar}>
            Trocar
          </Button>
        )}
      </div>
    );
  }

  if (criando) {
    return (
      <div className="rounded-lg border border-borda p-4">
        <FormMotor
          cliente={clienteId ? { id: clienteId, nome: clienteNome ?? "" } : null}
          clienteFixo={!!clienteId}
          sugestao={termo}
          onCancelar={() => setCriando(false)}
          onSalvo={(m) => {
            setCriando(false);
            onSelecionado(m);
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <label className="relative block">
        <span className="sr-only">Buscar motor</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-texto-secundario"
          aria-hidden
        />
        <Input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Marca, modelo, código, nº de série ou placa"
          className="pl-10"
          autoComplete="off"
        />
      </label>
      <ul
        className="grid max-h-64 gap-1 overflow-y-auto"
        aria-label="Motores encontrados"
        aria-busy={buscando}
      >
        {lista.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onSelecionado(m)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-borda bg-superficie px-3 py-2 text-left hover:bg-fundo"
            >
              <ResumoMotor motor={m} />
              {clienteId && m.cliente_id === clienteId && (
                <span className="shrink-0 text-xs font-semibold text-sucesso">Do cliente</span>
              )}
            </button>
          </li>
        ))}
        {!buscando && lista.length === 0 && (
          <li className="px-1 py-2 text-sm text-texto-secundario">
            {termo ? "Nenhum motor encontrado." : "Este cliente ainda não tem motores cadastrados."}
          </li>
        )}
      </ul>
      {pode("motores.editar") && (
        <Button type="button" variant="outline" onClick={() => setCriando(true)}>
          <Plus aria-hidden /> Cadastrar motor novo
        </Button>
      )}
    </div>
  );
}

function ResumoMotor({ motor }: { motor: MotorResumo }) {
  const detalhes = [
    motor.numero_serie && `Série ${motor.numero_serie}`,
    motor.veiculo_placa && formatarPlaca(motor.veiculo_placa),
    motor.veiculo_modelo,
  ].filter(Boolean);
  return (
    <span className="min-w-0">
      <span className="block truncate text-[15px] font-medium">{descricaoMotor(motor)}</span>
      {detalhes.length > 0 && (
        <span className="block truncate text-sm text-texto-secundario">{detalhes.join(" · ")}</span>
      )}
    </span>
  );
}
