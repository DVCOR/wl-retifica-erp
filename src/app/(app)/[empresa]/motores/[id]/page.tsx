import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info, Pencil } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { SemAcesso } from "@/components/app/sem-acesso";
import { Button } from "@/components/ui/button";
import { TabelaOs } from "@/components/clientes/tabela-os";
import { MotorSheet } from "@/components/motores/motor-sheet";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { pode, podeVerPrecos } from "@/lib/auth/permissoes";
import { historicoDoMotor, obterMotor } from "@/lib/data/motores";
import { formatarPlaca } from "@/lib/format";
import { descricaoMotor, ROTULO_COMBUSTIVEL } from "@/lib/validacoes/motores";

export const metadata: Metadata = { title: "Motor" };

export default async function MotorPage({ params }: PageProps<"/[empresa]/motores/[id]">) {
  const { empresa: slug, id } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "motores.ver")) return <SemAcesso slug={slug} />;
  if (!z.uuid().safeParse(id).success) notFound();

  const motor = await obterMotor(empresa.id, id);
  if (!motor) notFound();

  const vePrecos = podeVerPrecos(membro.papel, empresa.config);
  const historico = await historicoDoMotor(empresa.id, motor, vePrecos);
  const outros = historico.motores.filter((m) => m.id !== motor.id);
  const verCliente = pode(membro.papel, "clientes.ver");

  const dados: [string, string | null][] = [
    ["Código do motor", motor.codigo_motor],
    ["Nº de série", motor.numero_serie],
    ["Combustível", motor.combustivel ? ROTULO_COMBUSTIVEL[motor.combustivel] : null],
    ["Cilindros", motor.cilindros ? String(motor.cilindros) : null],
    [
      "Válvulas por cilindro",
      motor.valvulas_por_cilindro ? String(motor.valvulas_por_cilindro) : null,
    ],
    ["Cilindrada", motor.cilindrada],
    ["Placa", motor.veiculo_placa ? formatarPlaca(motor.veiculo_placa) : null],
    ["Veículo", [motor.veiculo_modelo, motor.veiculo_ano].filter(Boolean).join(" ") || null],
    ["Observações", motor.observacoes],
  ];

  return (
    <>
      <PageHeader
        voltar={{ href: `/${slug}/motores`, rotulo: "Motores" }}
        titulo={descricaoMotor(motor)}
        descricao={
          motor.cliente ? (
            verCliente ? (
              <>
                Cliente:{" "}
                <Link
                  href={`/${slug}/clientes/${motor.cliente.id}`}
                  className="font-medium text-primaria hover:underline"
                >
                  {motor.cliente.nome}
                </Link>
              </>
            ) : (
              `Cliente: ${motor.cliente.nome}`
            )
          ) : (
            "Motor sem cliente vinculado"
          )
        }
        acoes={
          pode(membro.papel, "motores.editar") && (
            <MotorSheet inicial={motor}>
              <Button variant="outline">
                <Pencil aria-hidden /> Editar
              </Button>
            </MotorSheet>
          )
        }
      />

      <section className="mb-5 rounded-xl border border-borda bg-superficie p-5">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {dados.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-sm text-texto-secundario">{k}</dt>
              <dd className="mt-0.5 text-[15px] font-medium break-words whitespace-pre-line">
                {v || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-borda bg-superficie">
        <div className="border-b border-borda p-4">
          <h2 className="text-base font-semibold">Histórico de OS deste motor</h2>
          <p className="mt-1 text-sm text-texto-secundario">
            Todas as OS do mesmo motor (código + nº de série) ou da mesma placa, mesmo vindas de
            clientes ou lojistas diferentes.
          </p>
          {outros.length > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-info-suave px-3 py-2.5 text-sm text-info">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Inclui {outros.length} outro{outros.length > 1 ? "s" : ""} cadastro
              {outros.length > 1 ? "s" : ""} com a mesma placa ou o mesmo código e nº de série.
            </p>
          )}
        </div>
        <TabelaOs
          slug={slug}
          os={historico.os}
          vePrecos={vePrecos}
          mostrarCliente={verCliente}
          mostrarMotor={outros.length > 0}
          vazio={{
            titulo: "Nenhuma OS para este motor",
            descricao: "As OS abertas com este motor ou placa aparecem aqui.",
          }}
        />
      </section>
    </>
  );
}
