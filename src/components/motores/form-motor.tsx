"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
  FormErro,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEmpresa } from "@/lib/auth/empresa-context";
import {
  COMBUSTIVEIS,
  mascararPlaca,
  motorSchema,
  ROTULO_COMBUSTIVEL,
  type MotorEntrada,
} from "@/lib/validacoes/motores";
import type { MotorCompleto, MotorResumo } from "@/lib/data/motores";
import { atualizarMotor, criarMotor } from "@/app/(app)/[empresa]/motores/actions";
import { CampoTexto } from "@/components/clientes/campo-texto";
import { SeletorCliente } from "@/components/clientes/seletor-cliente";
import { formatarPlaca } from "@/lib/format";

type Props = {
  /** Motor existente (edição); ausente = novo. */
  inicial?: MotorCompleto & { cliente?: { id: string; nome: string } | null };
  /** Cliente já definido (ex.: vindo da ficha ou do wizard). */
  cliente?: { id: string; nome: string } | null;
  /** Esconde o seletor de cliente (cliente fixo). */
  clienteFixo?: boolean;
  /** Texto digitado na busca, para sugerir código/placa. */
  sugestao?: string;
  onSalvo?: (motor: MotorResumo) => void;
  onCancelar?: () => void;
};

const SEM_COMBUSTIVEL = "__nenhum";

function valores(m: Props["inicial"], clienteId: string | null, sugestao?: string): MotorEntrada {
  return {
    cliente_id: m?.cliente_id ?? clienteId ?? "",
    marca: m?.marca ?? "",
    modelo: m?.modelo ?? sugestao ?? "",
    codigo_motor: m?.codigo_motor ?? "",
    numero_serie: m?.numero_serie ?? "",
    combustivel: m?.combustivel ?? "",
    cilindros: m?.cilindros?.toString() ?? "",
    cilindrada: m?.cilindrada ?? "",
    valvulas_por_cilindro: m?.valvulas_por_cilindro?.toString() ?? "",
    veiculo_placa: m?.veiculo_placa ? formatarPlaca(m.veiculo_placa) : "",
    veiculo_modelo: m?.veiculo_modelo ?? "",
    veiculo_ano: m?.veiculo_ano?.toString() ?? "",
    observacoes: m?.observacoes ?? "",
  };
}

const soDigitos = (v: string) => v.replace(/\D/g, "");

/** Cadastro/edição de motor (vinculado ou não a um cliente). */
export function FormMotor({ inicial, cliente, clienteFixo, sugestao, onSalvo, onCancelar }: Props) {
  const { empresa } = useEmpresa();
  const [erro, setErro] = React.useState<string | null>(null);
  const [pendente, startTransition] = React.useTransition();
  const [clienteSel, setClienteSel] = React.useState<{ id: string; nome: string } | null>(
    inicial?.cliente ?? cliente ?? null,
  );

  const form = useForm<MotorEntrada>({
    resolver: zodResolver(motorSchema) as unknown as Resolver<MotorEntrada>,
    defaultValues: valores(inicial, cliente?.id ?? null, sugestao),
  });

  const enviar = () =>
    startTransition(async () => {
      setErro(null);
      const v = { ...form.getValues(), cliente_id: clienteSel?.id ?? "" };
      if (inicial) {
        const r = await atualizarMotor(empresa.slug, inicial.id, v);
        if (r.ok) {
          toast.success("Motor atualizado");
          onSalvo?.({ ...inicial, ...parseLocal(v) });
        } else setErro(r.erro);
        return;
      }
      const r = await criarMotor(empresa.slug, v);
      if (r.ok) {
        toast.success("Motor cadastrado");
        onSalvo?.(r.dados);
      } else setErro(r.erro);
    });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // Pode estar dentro de outro formulário (wizard): não propaga o submit.
          e.stopPropagation();
          void form.handleSubmit(enviar)(e);
        }}
        className="grid gap-4"
        noValidate
        aria-label={inicial ? "Editar motor" : "Novo motor"}
      >
        {!clienteFixo && (
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-texto">Cliente (opcional)</span>
            <SeletorCliente
              valor={clienteSel}
              onSelecionado={setClienteSel}
              permitirCriar={false}
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            control={form.control}
            name="marca"
            rotulo="Marca"
            placeholder="Ex.: VW"
            maxLength={60}
          />
          <CampoTexto
            control={form.control}
            name="modelo"
            rotulo="Modelo"
            placeholder="Ex.: EA111 1.6 8v"
            maxLength={80}
          />
          <CampoTexto
            control={form.control}
            name="codigo_motor"
            rotulo="Código do motor"
            maxLength={40}
            autoCapitalize="characters"
          />
          <CampoTexto
            control={form.control}
            name="numero_serie"
            rotulo="Nº de série"
            maxLength={60}
            autoCapitalize="characters"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField
            control={form.control}
            name="combustivel"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Combustível</FormLabel>
                <Select
                  value={field.value ? field.value : SEM_COMBUSTIVEL}
                  onValueChange={(v) => field.onChange(v === SEM_COMBUSTIVEL ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SEM_COMBUSTIVEL}>Não informado</SelectItem>
                    {COMBUSTIVEIS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ROTULO_COMBUSTIVEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <CampoTexto
            control={form.control}
            name="cilindros"
            rotulo="Cilindros"
            inputMode="numeric"
            mascara={soDigitos}
            maxLength={2}
          />
          <CampoTexto
            control={form.control}
            name="valvulas_por_cilindro"
            rotulo="Válvulas/cil."
            inputMode="numeric"
            mascara={soDigitos}
            maxLength={1}
          />
          <CampoTexto
            control={form.control}
            name="cilindrada"
            rotulo="Cilindrada"
            placeholder="1.6"
            maxLength={20}
          />
        </div>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-3 text-sm font-semibold text-texto-secundario sm:col-span-3">
            Veículo
          </legend>
          <CampoTexto
            control={form.control}
            name="veiculo_placa"
            rotulo="Placa"
            mascara={mascararPlaca}
            placeholder="ABC1D23"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <CampoTexto
            control={form.control}
            name="veiculo_modelo"
            rotulo="Modelo do veículo"
            maxLength={80}
          />
          <CampoTexto
            control={form.control}
            name="veiculo_ano"
            rotulo="Ano"
            inputMode="numeric"
            mascara={soDigitos}
            maxLength={4}
          />
        </fieldset>
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} maxLength={2000} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormErro mensagem={erro} />
        <div className="flex flex-wrap justify-end gap-2">
          {onCancelar && (
            <Button type="button" variant="outline" onClick={onCancelar} disabled={pendente}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : inicial ? "Salvar alterações" : "Cadastrar motor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Converte a entrada do formulário no formato resumido (sem validar de novo). */
function parseLocal(v: MotorEntrada): Partial<MotorResumo> {
  const r = motorSchema.safeParse(v);
  return r.success ? r.data : {};
}
