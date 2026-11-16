"use client";

import * as React from "react";
import { Cog, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarPlaca } from "@/lib/format";
import { rotuloMotor } from "@/lib/recebimento/rotulos";
import type { MotorResumo } from "@/lib/recebimento/tipos";
import { COMBUSTIVEIS, motorRapidoSchema } from "@/lib/validacoes/recebimento";
import {
  criarMotorRapidoAction,
  listarMotoresDoClienteAction,
} from "@/app/(app)/[empresa]/os/nova/actions";
import { cn } from "@/lib/utils";

/**
 * Seleção de motor do wizard: motores já cadastrados do cliente ou cadastro
 * rápido. Interface isolada (troca fácil pelo `seletor-motor` do módulo Motores).
 */
type MotorBuscaRapidaProps = {
  slug: string;
  clienteId: string;
  selecionadoId: string | null;
  /** `null` = seguir sem motor cadastrado (opcional na OS). */
  aoSelecionar: (motor: MotorResumo | null) => void;
};

export function MotorBuscaRapida({
  slug,
  clienteId,
  selecionadoId,
  aoSelecionar,
}: MotorBuscaRapidaProps) {
  const [motores, setMotores] = React.useState<MotorResumo[] | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [novo, setNovo] = React.useState(false);

  React.useEffect(() => {
    let ativo = true;
    void listarMotoresDoClienteAction(slug, clienteId).then((r) => {
      if (!ativo) return;
      if (r.ok) setMotores(r.dados);
      else {
        setErro(r.erro);
        setMotores([]);
      }
    });
    return () => {
      ativo = false;
    };
  }, [slug, clienteId]);

  function aoCriar(motor: MotorResumo) {
    setMotores((atual) => [motor, ...(atual ?? [])]);
    setNovo(false);
    aoSelecionar(motor);
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold text-texto">Motor do cliente</h3>
      {motores === null && (
        <p className="flex items-center gap-2 text-texto-secundario">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando motores…
        </p>
      )}
      {erro && (
        <p role="alert" className="text-sm font-medium text-perigo">
          {erro}
        </p>
      )}
      {motores && motores.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2" aria-label="Motores do cliente">
          {motores.map((m) => {
            const ativo = m.id === selecionadoId;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => aoSelecionar(m)}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-4 py-2 text-left",
                    ativo
                      ? "border-primaria bg-primaria-suave"
                      : "border-borda bg-superficie hover:border-borda-forte",
                  )}
                >
                  <Cog className="size-6 shrink-0 text-neutro" aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-semibold text-texto">
                      {rotuloMotor(m)}
                    </span>
                    <span className="truncate text-sm text-texto-secundario">
                      {[
                        m.numero_serie ? `Série ${m.numero_serie}` : null,
                        m.veiculo_placa ? `Placa ${formatarPlaca(m.veiculo_placa)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sem série/placa"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {motores && motores.length === 0 && !novo && (
        <p className="text-[15px] text-texto-secundario">
          Este cliente ainda não tem motor cadastrado. Cadastre o motor que chegou agora.
        </p>
      )}

      {!novo ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="bancada"
            className="h-14"
            onClick={() => setNovo(true)}
          >
            <Plus aria-hidden />
            Cadastrar motor novo
          </Button>
          <Button
            type="button"
            variant={selecionadoId === null ? "outline" : "ghost"}
            size="bancada"
            className="h-14"
            onClick={() => aoSelecionar(null)}
          >
            Seguir sem cadastrar motor
          </Button>
        </div>
      ) : (
        <FormMotorRapido
          slug={slug}
          clienteId={clienteId}
          aoCriar={aoCriar}
          aoCancelar={() => setNovo(false)}
        />
      )}
    </div>
  );
}

function FormMotorRapido({
  slug,
  clienteId,
  aoCriar,
  aoCancelar,
}: {
  slug: string;
  clienteId: string;
  aoCriar: (motor: MotorResumo) => void;
  aoCancelar: () => void;
}) {
  const [campos, setCampos] = React.useState({
    marca: "",
    modelo: "",
    codigo_motor: "",
    numero_serie: "",
    combustivel: "",
    cilindros: "",
    veiculo_placa: "",
  });
  const [salvando, setSalvando] = React.useState(false);
  const [erros, setErros] = React.useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = React.useState<string | null>(null);

  const mudar =
    (k: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCampos((c) => ({ ...c, [k]: e.target.value }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    const entrada = { ...campos, cliente_id: clienteId };
    const v = motorRapidoSchema.safeParse(entrada);
    if (!v.success) {
      const m: Record<string, string> = {};
      for (const i of v.error.issues) m[String(i.path[0])] = i.message;
      setErros(m);
      return;
    }
    setErros({});
    setSalvando(true);
    const r = await criarMotorRapidoAction(slug, entrada);
    setSalvando(false);
    if (r.ok) aoCriar(r.dados);
    else setErroGeral(r.erro);
  }

  const campo = (
    k: keyof typeof campos,
    rotulo: string,
    extra?: { placeholder?: string; inputMode?: "numeric" },
  ) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`mr-${k}`}>{rotulo}</Label>
      <Input
        id={`mr-${k}`}
        className="h-12"
        value={campos[k]}
        onChange={mudar(k)}
        aria-invalid={Boolean(erros[k])}
        {...extra}
      />
      {erros[k] && <p className="text-sm text-perigo">{erros[k]}</p>}
    </div>
  );

  return (
    <form
      onSubmit={salvar}
      aria-label="Cadastro rápido de motor"
      className="flex flex-col gap-4 rounded-xl border border-borda-forte bg-fundo/60 p-4"
    >
      <h3 className="text-base font-bold text-texto">Novo motor</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campo("marca", "Marca", { placeholder: "VW, Fiat, GM…" })}
        {campo("modelo", "Modelo", { placeholder: "Gol 1.6 8v" })}
        {campo("codigo_motor", "Código do motor", { placeholder: "EA111" })}
        {campo("numero_serie", "Nº de série / gravação")}
        <div className="grid gap-1.5">
          <Label htmlFor="mr-combustivel">Combustível</Label>
          <select
            id="mr-combustivel"
            value={campos.combustivel}
            onChange={mudar("combustivel")}
            className="h-12 w-full rounded-lg border border-input bg-superficie px-3 text-[15px] text-texto"
          >
            <option value="">Não informado</option>
            {COMBUSTIVEIS.map((c) => (
              <option key={c} value={c}>
                {c === "gnv" ? "GNV" : c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {campo("cilindros", "Cilindros", { inputMode: "numeric" })}
        {campo("veiculo_placa", "Placa do veículo (opcional)", { placeholder: "ABC1D23" })}
      </div>
      {erroGeral && (
        <p role="alert" className="text-sm font-medium text-perigo">
          {erroGeral}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="bancada" className="h-12" disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" aria-hidden />}
          Salvar motor
        </Button>
        <Button type="button" variant="ghost" size="bancada" className="h-12" onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
