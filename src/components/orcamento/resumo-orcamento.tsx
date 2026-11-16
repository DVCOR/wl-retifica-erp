import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pode, podeVerPrecos } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { obterEmpresaIdDaOs, obterResumoOrcamento, obterSlugEmpresa } from "@/lib/data/orcamento";
import { formatarData, formatarMoeda } from "@/lib/format";
import { ROTULO_STATUS_ORCAMENTO } from "@/lib/orcamento/calculos";

const TOM = {
  rascunho: "neutro",
  enviado: "roxo",
  aprovado: "sucesso",
  reprovado: "perigo",
  substituido: "contorno",
} as const;

/**
 * Resumo do orçamento para a aba "Orçamento" da OS: versão, status, total e
 * link para o editor. Server component. `slug` é opcional (evita uma consulta
 * quando a página já o conhece).
 */
export async function ResumoOrcamento({ osId, slug: slugInformado }: { osId: string; slug?: string }) {
  const empresaId = await obterEmpresaIdDaOs(osId);
  if (!empresaId) return null;
  const slug = slugInformado ?? (await obterSlugEmpresa(empresaId));
  if (!slug) return null;
  const { empresa, membro } = await obterContextoEmpresa(slug);
  const veValores = podeVerPrecos(membro.papel, empresa.config);
  const resumo = veValores ? await obterResumoOrcamento(empresa.id, osId) : null;
  const abrir = pode(membro.papel, "orcamento.montar");

  return (
    <section className="rounded-xl border border-borda bg-superficie p-4" aria-label="Resumo do orçamento">
      {resumo ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
              Versão {resumo.versao}
              <Badge variant={TOM[resumo.status]}>{ROTULO_STATUS_ORCAMENTO[resumo.status]}</Badge>
            </p>
            <p className="text-2xl font-bold tabular-nums">{formatarMoeda(resumo.total)}</p>
            <p className="text-sm text-texto-secundario">
              {resumo.itens} {resumo.itens === 1 ? "item" : "itens"}
              {resumo.validade && ` · válido até ${formatarData(resumo.validade)}`}
            </p>
          </div>
          {abrir && (
            <Button asChild>
              <Link href={`/${slug}/os/${osId}/orcamento`}>
                <FileText aria-hidden /> Abrir orçamento
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-texto-secundario">
            {veValores ? "Esta OS ainda não tem orçamento." : "Valores do orçamento não disponíveis para o seu perfil."}
          </p>
          {abrir && (
            <Button asChild>
              <Link href={`/${slug}/os/${osId}/orcamento`}>
                <FileText aria-hidden /> Abrir orçamento
              </Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
