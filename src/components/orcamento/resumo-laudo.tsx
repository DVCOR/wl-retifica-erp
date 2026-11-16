import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { SeloConformidade } from "@/components/orcamento/laudo-medicoes";
import { Button } from "@/components/ui/button";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { listarMedicoes, obterEmpresaIdDaOs, obterSlugEmpresa } from "@/lib/data/orcamento";
import { formatarFaixa, formatarNumero, resumirMedicoes } from "@/lib/orcamento/medicao";

/**
 * Resumo do laudo para a aba "Laudo" da OS: contagem, lista curta e link para a
 * tela de medições. Server component. `slug` é opcional.
 */
export async function ResumoLaudo({ osId, slug: slugInformado }: { osId: string; slug?: string }) {
  const empresaId = await obterEmpresaIdDaOs(osId);
  if (!empresaId) return null;
  const slug = slugInformado ?? (await obterSlugEmpresa(empresaId));
  if (!slug) return null;
  await obterContextoEmpresa(slug);
  const medicoes = await listarMedicoes(empresaId, osId);
  const r = resumirMedicoes(medicoes);

  return (
    <section className="rounded-xl border border-borda bg-superficie p-4" aria-label="Resumo do laudo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">
          {r.total === 0
            ? "Nenhuma medição registrada"
            : `${r.total} ${r.total === 1 ? "medição" : "medições"} · ${r.naoConformes} não conforme${r.naoConformes === 1 ? "" : "s"}`}
        </p>
        <Button asChild variant="secondary">
          <Link href={`/${slug}/os/${osId}/laudo`}>
            <ClipboardList aria-hidden /> Abrir laudo
          </Link>
        </Button>
      </div>
      {medicoes.length > 0 && (
        <ul className="mt-3 divide-y divide-borda">
          {medicoes.slice(0, 6).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-[15px]">
              <span className="min-w-0">
                {m.componente} · {m.descricao}
                <span className="block text-sm text-texto-secundario">
                  {m.valor !== null
                    ? `${formatarNumero(Number(m.valor))}${m.unidade ? ` ${m.unidade}` : ""}`
                    : m.valor_texto}
                  {formatarFaixa(
                    m.minimo === null ? null : Number(m.minimo),
                    m.maximo === null ? null : Number(m.maximo),
                    m.unidade,
                  ) &&
                    ` · faixa ${formatarFaixa(
                      m.minimo === null ? null : Number(m.minimo),
                      m.maximo === null ? null : Number(m.maximo),
                      m.unidade,
                    )}`}
                </span>
              </span>
              <SeloConformidade conforme={m.conforme} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
