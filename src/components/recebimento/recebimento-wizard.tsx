"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OsRecebimento } from "@/lib/data/recebimento";
import { contarDivergencias } from "@/lib/recebimento/divergencias";
import { resumoOs } from "@/lib/recebimento/rotulos";
import { concluirChecklistAction } from "@/app/(app)/[empresa]/os/[id]/recebimento/actions";
import { EtapaAssinatura } from "./etapa-assinatura";
import { EtapaChecklist } from "./etapa-checklist";
import { EtapaComprovante } from "./etapa-comprovante";
import { EtapaFotos } from "./etapa-fotos";
import type { EtapaId } from "./etapas";
import { useChecklist } from "./use-checklist";
import { useFotosOs } from "./use-fotos-os";
import { WizardCabecalho } from "./wizard-cabecalho";

type RecebimentoWizardProps = {
  slug: string;
  empresaId: string;
  nomeEmpresa: string;
  os: OsRecebimento;
  etapaInicial: Extract<EtapaId, "checklist" | "fotos" | "assinatura" | "comprovante">;
};

/** Etapas 3 a 6 do wizard (a OS já existe e o rascunho sobrevive a recarregar). */
export function RecebimentoWizard({
  slug,
  empresaId,
  nomeEmpresa,
  os,
  etapaInicial,
}: RecebimentoWizardProps) {
  const router = useRouter();
  const [etapa, setEtapa] = React.useState<EtapaId>(etapaInicial);
  const [avancando, setAvancando] = React.useState(false);

  const checklist = useChecklist(slug, os.id, os.itens);
  const fotos = useFotosOs({
    slug,
    empresaId,
    osId: os.id,
    iniciais: os.fotos.map((f) => ({
      id: f.id,
      url: f.url,
      checklistItemId: f.checklist_item_id,
    })),
  });

  const itensSemSalvar = Object.keys(checklist.salvar).length;
  const divergencias = contarDivergencias(checklist.itens);

  async function irParaFotos() {
    setAvancando(true);
    const r = await concluirChecklistAction(slug, os.id);
    setAvancando(false);
    if (!r.ok) {
      toast.error(r.erro);
      return;
    }
    setEtapa("fotos");
    window.scrollTo({ top: 0 });
  }

  const emRecebimento = os.status === "em_recebimento" && etapa !== "comprovante";

  return (
    <div className="flex flex-col gap-3">
      <WizardCabecalho
        titulo={etapa === "comprovante" ? "Recebimento concluído" : "Nova OS · Recebimento"}
        subtitulo={
          <>
            <span className="numero-os">OS {os.numero}</span>
            {" · "}
            {resumoOs({
              clienteNome: os.cliente.nome,
              clienteTipo: os.cliente.tipo,
              motor: os.motor,
              placaCarro: os.cliente_final_placa,
            })}
          </>
        }
        voltarHref={`/${slug}/os/${os.id}`}
        etapaAtual={etapa}
        etapasNavegaveis={emRecebimento ? ["checklist", "fotos", "assinatura"] : []}
        aoIrParaEtapa={(e) => setEtapa(e)}
      />

      {etapa === "checklist" && (
        <EtapaChecklist
          itens={checklist.itens}
          salvar={checklist.salvar}
          fotos={fotos.fotos}
          avancando={avancando}
          aoAtualizar={checklist.atualizar}
          aoTentarDeNovo={checklist.tentarDeNovo}
          aoMarcarGrupo={checklist.marcarGrupo}
          aoFotografar={(itemId, arquivos) => void fotos.adicionarArquivos(arquivos, itemId)}
          aoRetentarFoto={fotos.retentar}
          aoRemoverFoto={(f) => void fotos.remover(f)}
          aoAvancar={irParaFotos}
        />
      )}

      {etapa === "fotos" && (
        <EtapaFotos
          fotos={fotos.fotos}
          geraisGravadas={fotos.geraisGravadas}
          aoFotografar={(arquivos) => void fotos.adicionarArquivos(arquivos, null)}
          aoRetentarFoto={fotos.retentar}
          aoRemoverFoto={(f) => void fotos.remover(f)}
          aoVoltar={() => setEtapa("checklist")}
          aoAvancar={() => {
            setEtapa("assinatura");
            window.scrollTo({ top: 0 });
          }}
        />
      )}

      {etapa === "assinatura" && (
        <EtapaAssinatura
          slug={slug}
          empresaId={empresaId}
          osId={os.id}
          itens={checklist.itens}
          geraisGravadas={fotos.geraisGravadas}
          fotosPendentes={fotos.pendentes}
          itensSemSalvar={itensSemSalvar}
          aoVoltar={() => setEtapa("fotos")}
          aoFinalizar={() => {
            toast.success("Motor recebido. Comprovante pronto.");
            setEtapa("comprovante");
            window.scrollTo({ top: 0 });
            router.refresh();
          }}
        />
      )}

      {etapa === "comprovante" && (
        <EtapaComprovante
          slug={slug}
          osId={os.id}
          numeroOs={os.numero}
          nomeEmpresa={nomeEmpresa}
          nomeCliente={os.cliente.nome}
          telefoneCliente={os.cliente.telefone_whatsapp}
          tokenPublico={os.token_publico}
          qtdDivergencias={divergencias}
        />
      )}
    </div>
  );
}
