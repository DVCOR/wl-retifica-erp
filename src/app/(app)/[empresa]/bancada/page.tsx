import type { Metadata } from "next";
import { SemAcesso } from "@/components/app/sem-acesso";
import { BancadaView } from "@/components/bancada/bancada-view";
import { LeitorQr } from "@/components/bancada/leitor-qr";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { listarMedicoesOs, listarMinhasOs } from "@/lib/data/bancada";
import { obterExecucaoOs } from "@/lib/data/os";
import { hojeSaoPaulo } from "@/lib/os/quadro";

export const metadata: Metadata = { title: "Minha bancada" };

export default async function Pagina({ params, searchParams }: PageProps<"/[empresa]/bancada">) {
  const { empresa: slug } = await params;
  const sp = await searchParams;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "bancada.acessar")) return <SemAcesso slug={slug} />;

  const minhas = await listarMinhasOs(empresa.id, membro.id);
  const pedida = typeof sp.os === "string" ? sp.os : null;
  const selecionada = minhas.find((o) => o.id === pedida) ?? minhas[0] ?? null;
  const [exec, medicoes] = selecionada
    ? await Promise.all([
        obterExecucaoOs(empresa.id, selecionada.id),
        listarMedicoesOs(empresa.id, selecionada.id),
      ])
    : [{ itens: [], apontamentos: [] }, []];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-4 rounded-xl bg-preto p-4 text-white md:p-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold">Minha bancada</h1>
          <p className="text-sm text-texto-claro">
            {membro.nome} · {membro.papel === "dono" ? "Dono" : "Técnico"} · {minhas.length} OS
            atribuída{minhas.length === 1 ? "" : "s"}
          </p>
        </div>
        <LeitorQr slug={slug} />
      </header>
      <BancadaView
        slug={slug}
        empresaId={empresa.id}
        membroId={membro.id}
        hoje={hojeSaoPaulo()}
        minhas={minhas}
        selecionada={selecionada}
        itens={exec.itens}
        apontamentos={exec.apontamentos}
        medicoes={medicoes}
      />
    </div>
  );
}
