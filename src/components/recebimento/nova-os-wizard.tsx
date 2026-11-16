"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarTelefone } from "@/lib/format";
import { dataLocalIso, somarDias } from "@/lib/recebimento/datas";
import { resumoOs } from "@/lib/recebimento/rotulos";
import type { ClienteResumo } from "@/lib/recebimento/tipos";
import { novaOsSchema } from "@/lib/validacoes/recebimento";
import { criarOsAction, obterClienteParaOsAction } from "@/app/(app)/[empresa]/os/nova/actions";
import { SeletorCliente } from "@/components/clientes/seletor-cliente";
import { SeletorMotor, type MotorSelecionado } from "@/components/motores/seletor-motor";
import type { EtapaId } from "./etapas";
import { WizardCabecalho } from "./wizard-cabecalho";

type NovaOsWizardProps = {
  slug: string;
  /** Vem de `?cliente=<id>`: pula a busca. */
  clienteInicial: ClienteResumo | null;
};

/**
 * Etapas 1 e 2. Ao concluir o motor chama `criar_os` e segue para
 * /[empresa]/os/[id]/recebimento, então recarregar a página não perde o rascunho.
 */
export function NovaOsWizard({ slug, clienteInicial }: NovaOsWizardProps) {
  const router = useRouter();
  const [cliente, setCliente] = React.useState<ClienteResumo | null>(clienteInicial);
  const [motor, setMotor] = React.useState<MotorSelecionado | null>(null);
  const [motorDecidido, setMotorDecidido] = React.useState(false);
  const [prazo, setPrazo] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [carroNome, setCarroNome] = React.useState("");
  const [carroPlaca, setCarroPlaca] = React.useState("");
  const [carroTelefone, setCarroTelefone] = React.useState("");
  const [criando, setCriando] = React.useState(false);
  const [carregandoCliente, setCarregandoCliente] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [erros, setErros] = React.useState<Record<string, string>>({});

  const etapa: EtapaId = cliente ? "motor" : "cliente";
  const lojista = cliente?.tipo === "lojista";
  const hoje = React.useMemo(() => new Date(), []);

  function trocarCliente() {
    setCliente(null);
    setMotor(null);
    setMotorDecidido(false);
  }

  /** O seletor devolve só id/nome: busca tipo e telefone para o resto do wizard. */
  async function escolherCliente(escolhido: { id: string; nome: string } | null) {
    if (!escolhido) return;
    setErro(null);
    setCarregandoCliente(true);
    const r = await obterClienteParaOsAction(slug, escolhido.id);
    setCarregandoCliente(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setCliente(r.dados);
  }

  async function criar() {
    if (!cliente) return;
    setErro(null);
    const entrada = {
      cliente_id: cliente.id,
      motor_id: motor?.id ?? "",
      prazo_prometido: prazo,
      observacoes,
      cliente_final_nome: lojista ? carroNome : "",
      cliente_final_placa: lojista ? carroPlaca : "",
      cliente_final_telefone: lojista ? carroTelefone : "",
    };
    const v = novaOsSchema.safeParse(entrada);
    if (!v.success) {
      const m: Record<string, string> = {};
      for (const i of v.error.issues) m[String(i.path[0])] = i.message;
      setErros(m);
      return;
    }
    setErros({});
    setCriando(true);
    const r = await criarOsAction(slug, entrada);
    if (!r.ok) {
      setCriando(false);
      setErro(r.erro);
      return;
    }
    router.push(`/${slug}/os/${r.dados.id}/recebimento`);
  }

  return (
    <div className="flex flex-col gap-3">
      <WizardCabecalho
        titulo="Nova OS"
        subtitulo={
          cliente
            ? resumoOs({ clienteNome: cliente.nome, clienteTipo: cliente.tipo, motor })
            : "Comece escolhendo o cliente."
        }
        voltarHref={`/${slug}/os`}
        etapaAtual={etapa}
        etapasNavegaveis={["cliente"]}
        aoIrParaEtapa={() => trocarCliente()}
      />

      {!cliente && (
        <section className="rounded-xl border border-borda bg-superficie p-4 md:p-6">
          <h2 className="mb-3 text-base font-semibold text-texto">Cliente</h2>
          {carregandoCliente ? (
            <p
              className="flex min-h-12 items-center gap-2 text-texto-secundario"
              aria-live="polite"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando cliente…
            </p>
          ) : (
            <SeletorCliente id="nova-os-cliente" valor={null} onSelecionado={escolherCliente} />
          )}
          {erro && (
            <p role="alert" className="mt-2 text-sm font-medium text-perigo">
              {erro}
            </p>
          )}
        </section>
      )}

      {cliente && (
        <div className="flex flex-col gap-3">
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borda bg-superficie p-4 md:px-6">
            <div className="min-w-0">
              <p className="text-sm text-texto-secundario">Cliente</p>
              <p className="truncate text-lg font-bold text-texto">{cliente.nome}</p>
              <p className="text-sm text-texto-secundario">
                {cliente.tipo === "lojista" ? "Lojista" : "Cliente final"} ·{" "}
                {formatarTelefone(cliente.telefone_whatsapp)}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="bancada"
              className="h-12"
              onClick={trocarCliente}
            >
              Trocar cliente
            </Button>
          </section>

          <section className="rounded-xl border border-borda bg-superficie p-4 md:p-6">
            <h3 className="mb-3 text-base font-semibold text-texto">Motor</h3>
            <SeletorMotor
              clienteId={cliente.id}
              clienteNome={cliente.nome}
              valor={motor}
              onSelecionado={(m) => {
                setMotor(m);
                setMotorDecidido(true);
              }}
              onLimpar={() => {
                setMotor(null);
                setMotorDecidido(false);
              }}
            />
            {!motor && (
              <Button
                type="button"
                variant={motorDecidido ? "outline" : "ghost"}
                size="bancada"
                className="mt-2 h-12 w-full"
                aria-pressed={motorDecidido}
                onClick={() => setMotorDecidido(true)}
              >
                {motorDecidido ? "Seguindo sem motor cadastrado" : "Seguir sem cadastrar motor"}
              </Button>
            )}
          </section>

          {lojista && (
            <section className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4 md:p-6">
              <div>
                <h3 className="text-base font-semibold text-texto">Carro do cliente do lojista</h3>
                <p className="text-sm text-texto-secundario">
                  Opcional. Ajuda a achar a OS depois pela placa.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="carro-nome">Nome do dono do carro</Label>
                  <Input
                    id="carro-nome"
                    className="h-12"
                    value={carroNome}
                    onChange={(e) => setCarroNome(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="carro-placa">Placa</Label>
                  <Input
                    id="carro-placa"
                    className="h-12 uppercase"
                    placeholder="ABC1D23"
                    value={carroPlaca}
                    onChange={(e) => setCarroPlaca(e.target.value)}
                    aria-invalid={Boolean(erros.cliente_final_placa)}
                  />
                  {erros.cliente_final_placa && (
                    <p className="text-sm text-perigo">{erros.cliente_final_placa}</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="carro-tel">Telefone</Label>
                  <Input
                    id="carro-tel"
                    className="h-12"
                    inputMode="tel"
                    value={carroTelefone}
                    onChange={(e) => setCarroTelefone(e.target.value)}
                    aria-invalid={Boolean(erros.cliente_final_telefone)}
                  />
                  {erros.cliente_final_telefone && (
                    <p className="text-sm text-perigo">{erros.cliente_final_telefone}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-4 rounded-xl border border-borda bg-superficie p-4 md:grid-cols-2 md:p-6">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="prazo">Prazo prometido</Label>
              <Input
                id="prazo"
                type="date"
                className="h-12 max-w-56"
                min={dataLocalIso(hoje)}
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                aria-invalid={Boolean(erros.prazo_prometido)}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[3, 7, 15].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPrazo(somarDias(hoje, d))}
                    className="inline-flex h-11 items-center rounded-full border border-borda-forte px-4 text-sm font-medium text-texto hover:bg-fundo"
                  >
                    +{d} dias
                  </button>
                ))}
              </div>
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="obs-os">Observações</Label>
              <Textarea
                id="obs-os"
                rows={3}
                placeholder="Algo que o cliente pediu ou que a bancada precisa saber"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </section>

          <footer className="sticky bottom-[76px] z-30 flex flex-col gap-2 rounded-xl border border-borda bg-superficie px-4 py-3 shadow-sm sm:flex-row sm:items-center md:bottom-3 lg:px-6">
            <p className="flex-1 text-[15px] text-texto-secundario" aria-live="polite">
              {erro ? (
                <span role="alert" className="font-medium text-perigo">
                  {erro}
                </span>
              ) : motorDecidido ? (
                "Pronto: ao continuar, a OS é criada e o checklist abre."
              ) : (
                "Escolha o motor, cadastre um novo ou siga sem motor."
              )}
            </p>
            <Button
              type="button"
              size="bancada"
              className="h-[52px] rounded-xl"
              disabled={!motorDecidido || criando}
              onClick={criar}
            >
              {criando && <Loader2 className="animate-spin" aria-hidden />}
              Criar OS e abrir checklist
            </Button>
          </footer>
        </div>
      )}
    </div>
  );
}
