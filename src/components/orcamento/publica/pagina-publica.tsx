import { Check } from "lucide-react";
import { RespostaPublica } from "@/components/orcamento/publica/resposta-publica";
import { SUPABASE_URL } from "@/lib/env";
import type { FotoPublica, OsPublica } from "@/lib/data/orcamento-publico";
import { formatarData, formatarMoeda, formatarNumeroOs } from "@/lib/format";
import { estadosEtapas, ETAPAS_PUBLICAS, tituloPublico } from "@/lib/orcamento/andamento";
import { formatarFaixa, formatarNumero, textoConstatacao } from "@/lib/orcamento/medicao";
import { formatarEnderecoEmpresa } from "@/lib/recebimento/endereco";
import { linkWhatsapp } from "@/lib/validacoes/clientes";
import { STATUS_OS } from "@/lib/os/status";
import { cn } from "@/lib/utils";

function urlLogo(logoPath: string | null): string {
  return logoPath
    ? `${SUPABASE_URL}/storage/v1/object/public/empresa-logos/${logoPath}`
    : "/brand/wl-marca.png";
}

/** Página pública (mobile-first) — segue docs/design/OSPublica.dc.html. */
export function PaginaPublica({
  token,
  dados,
  fotos,
}: {
  token: string;
  dados: OsPublica;
  fotos: FotoPublica[];
}) {
  const { empresa, os, orcamento, medicoes } = dados;
  const numero = formatarNumeroOs(os.numero);
  const motor = os.motor
    ? [os.motor.marca, os.motor.modelo].filter(Boolean).join(" ") || os.motor.codigo_motor
    : null;
  const etapas = estadosEtapas(os.status);
  const duvida = linkWhatsapp(
    empresa.telefone,
    `Olá! Tenho uma dúvida sobre a OS ${numero}.`,
  );
  const aguardando = orcamento?.status === "enviado";

  return (
    <div className="min-h-dvh bg-fundo text-texto">
      <header className="border-b-[3px] border-primaria bg-preto px-5 pt-5 pb-[18px] text-white">
        <div className="mx-auto flex max-w-2xl flex-col gap-1">
          <div className="mb-2 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo pública da empresa (Storage) */}
            <img src={urlLogo(empresa.logo_path)} alt={`Logo ${empresa.nome_fantasia}`} className="h-9 w-auto rounded-md" />
            <span className="text-[15px] font-bold">{empresa.nome_fantasia}</span>
          </div>
          <h1 className="text-[22px] font-bold">{tituloPublico(os.status, orcamento?.status ?? null)}</h1>
          <p className="text-sm text-texto-claro">
            <span className="font-mono">OS {numero}</span>
            {motor && ` · ${motor}`}
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-3.5 p-4">
        {os.status === "cancelado" ? (
          <p role="status" className="rounded-xl bg-perigo-suave p-4 text-[15px] font-semibold text-perigo">
            Esta OS foi cancelada. Fale com a retífica para mais informações.
          </p>
        ) : (
          <ol aria-label="Andamento" className="flex justify-between rounded-xl bg-superficie px-4 py-3.5">
            {ETAPAS_PUBLICAS.map((nome, i) => {
              const estado = etapas[i];
              return (
                <li
                  key={nome}
                  aria-current={estado === "atual" ? "step" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1.5 text-[11px]",
                    estado === "feita" && "font-semibold text-sucesso",
                    estado === "atual" && "font-bold text-primaria-hover",
                    estado === "futura" && "text-texto-secundario",
                  )}
                >
                  {estado === "feita" ? (
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-sucesso">
                      <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden />
                    </span>
                  ) : estado === "atual" ? (
                    <span className="size-6 rounded-full border-4 border-primaria-suave bg-primaria" />
                  ) : (
                    <span className="size-6 rounded-full bg-borda" />
                  )}
                  {nome}
                  <span className="sr-only">
                    {estado === "feita" ? " (concluída)" : estado === "atual" ? " (etapa atual)" : " (próxima)"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <p className="px-1 text-sm text-texto-secundario">
          Situação: <strong className="text-texto">{STATUS_OS[os.status].rotulo}</strong>
          {os.prazo_prometido && os.status !== "entregue" && ` · previsão ${formatarData(os.prazo_prometido)}`}
          {os.garantia_ate && ` · garantia até ${formatarData(os.garantia_ate)}`}
        </p>

        {(medicoes.length > 0 || fotos.length > 0) && (
          <section className="flex flex-col gap-3 rounded-xl bg-superficie p-4">
            <h2 className="text-[17px] font-bold">O que encontramos</h2>
            <p className="text-[15px] leading-relaxed text-neutro">{textoConstatacao(medicoes)}</p>
            {fotos.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {fotos.map((f, i) => (
                  <li key={i}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária */}
                      <img
                        src={f.url}
                        alt={f.legenda ?? `Foto ${i + 1} do seu motor`}
                        loading="lazy"
                        className="h-[84px] w-full rounded-lg object-cover"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {medicoes.length > 0 && (
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-primaria">
                  Ver laudo completo
                </summary>
                <ul className="mt-1 divide-y divide-borda">
                  {medicoes.map((m, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-[15px]">
                      <span className="min-w-0">
                        {m.componente} · {m.descricao}
                        <span className="block text-sm text-texto-secundario">
                          {m.valor !== null
                            ? `${formatarNumero(m.valor)}${m.unidade ? ` ${m.unidade}` : ""}`
                            : m.valor_texto}
                          {formatarFaixa(m.minimo, m.maximo, m.unidade) &&
                            ` · faixa ${formatarFaixa(m.minimo, m.maximo, m.unidade)}`}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold",
                          m.conforme === false ? "text-perigo" : m.conforme ? "text-sucesso" : "text-texto-secundario",
                        )}
                      >
                        {m.conforme === null ? "—" : m.conforme ? "Conforme" : "Fora da medida"}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        {orcamento ? (
          <section className="flex flex-col gap-1 rounded-xl bg-superficie p-4">
            <h2 className="mb-1.5 text-[17px] font-bold">Orçamento</h2>
            {orcamento.itens.map((i, idx) => (
              <div key={idx} className="flex justify-between gap-3 border-b border-borda py-2.5 text-[15px] last:border-0">
                <span>
                  {i.descricao}
                  {Number(i.quantidade) !== 1 && (
                    <span className="text-texto-secundario"> × {formatarNumero(Number(i.quantidade))}</span>
                  )}
                </span>
                <span className="tabular-nums">{formatarMoeda(i.total)}</span>
              </div>
            ))}
            {orcamento.desconto > 0 && (
              <div className="flex justify-between gap-3 py-2 text-[15px] text-texto-secundario">
                <span>Desconto</span>
                <span className="tabular-nums">−{formatarMoeda(orcamento.desconto)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 pt-3 pb-0.5 text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatarMoeda(orcamento.total)}</span>
            </div>
            {orcamento.validade && (
              <p className={cn("text-[13px]", orcamento.vencido && aguardando ? "font-semibold text-perigo" : "text-texto-secundario")}>
                {orcamento.vencido && aguardando
                  ? `Orçamento vencido em ${formatarData(orcamento.validade)}`
                  : `Válido até ${formatarData(orcamento.validade)}`}
              </p>
            )}
            {orcamento.observacoes && (
              <p className="mt-1 text-[13px] whitespace-pre-line text-texto-secundario">{orcamento.observacoes}</p>
            )}
          </section>
        ) : (
          os.status !== "cancelado" && (
            <section className="rounded-xl bg-superficie p-4 text-[15px] text-neutro">
              Estamos preparando o seu orçamento. Assim que estiver pronto, ele aparece aqui.
            </section>
          )
        )}

        {orcamento && aguardando && !orcamento.vencido && <RespostaPublica token={token} />}
        {orcamento && aguardando && orcamento.vencido && (
          <section className="flex flex-col gap-1.5 rounded-xl bg-alerta-suave p-4.5">
            <p className="text-lg font-bold text-alerta">Orçamento vencido</p>
            <p className="text-[15px] text-alerta">Fale com a retífica para atualizarmos os valores.</p>
          </section>
        )}
        {orcamento?.status === "aprovado" && (
          <section className="flex flex-col gap-1.5 rounded-xl bg-sucesso-suave p-4.5" role="status">
            <p className="text-lg font-bold text-sucesso">Orçamento aprovado</p>
            <p className="text-[15px] text-sucesso">
              Já avisamos a bancada. Você recebe uma mensagem quando o motor estiver pronto.
              {orcamento.respondido_por_nome &&
                ` Aprovado por ${orcamento.respondido_por_nome}${orcamento.respondido_em ? ` em ${formatarData(orcamento.respondido_em)}` : ""}.`}
            </p>
          </section>
        )}
        {orcamento?.status === "reprovado" && (
          <section className="flex flex-col gap-1.5 rounded-xl bg-superficie p-4.5" role="status">
            <p className="text-lg font-bold">Orçamento não aprovado</p>
            <p className="text-[15px] text-neutro">
              A retífica vai entrar em contato para combinar a devolução da peça.
            </p>
          </section>
        )}

        {duvida && (
          <a
            href={duvida}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center text-[15px] font-semibold text-primaria"
          >
            Tirar dúvidas no WhatsApp
          </a>
        )}

        <footer className="px-0 pt-2 pb-5 text-center text-[13px] leading-normal text-texto-secundario">
          {empresa.nome_fantasia}
          {formatarEnderecoEmpresa(empresa.endereco) && (
            <>
              <br />
              {formatarEnderecoEmpresa(empresa.endereco)}
            </>
          )}
        </footer>
      </main>
    </div>
  );
}
