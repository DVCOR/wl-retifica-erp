import Link from "next/link";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  MessageCircle,
  Plus,
  Printer,
  QrCode,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SITE_URL } from "@/lib/env";
import { linkWhatsapp, montarMensagemRecebimento } from "@/lib/recebimento/whatsapp";
import { cn } from "@/lib/utils";

type EtapaComprovanteProps = {
  slug: string;
  osId: string;
  numeroOs: string;
  nomeEmpresa: string;
  nomeCliente: string;
  telefoneCliente: string | null;
  tokenPublico: string;
  qtdDivergencias: number;
};

const acao = "h-14 w-full justify-start gap-3 rounded-xl px-5 text-base";

/** Etapa 6: comprovante em PDF, WhatsApp e etiqueta QR. */
export function EtapaComprovante({
  slug,
  osId,
  numeroOs,
  nomeEmpresa,
  nomeCliente,
  telefoneCliente,
  tokenPublico,
  qtdDivergencias,
}: EtapaComprovanteProps) {
  const base = `/${slug}/os/${osId}`;
  const mensagem = montarMensagemRecebimento({
    nomeCliente,
    numeroOs,
    empresa: nomeEmpresa,
    qtdDivergencias,
    linkOs: `${SITE_URL}/os-publica/${tokenPublico}`,
  });
  const semTelefone = !telefoneCliente;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-xl border border-borda bg-superficie p-5 md:p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-sucesso-suave text-sucesso">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <div>
          <h2 className="text-[22px] font-bold text-texto">Motor recebido</h2>
          <p className="text-[15px] text-texto-secundario">
            <span className="numero-os">OS {numeroOs}</span> · {nomeCliente}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <a
          href={`${base}/comprovante-recebimento?baixar=1`}
          className={cn(buttonVariants({ size: "bancada" }), acao)}
        >
          <Download aria-hidden />
          Baixar comprovante (PDF)
        </a>
        <a
          href={`${base}/comprovante-recebimento`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "secondary", size: "bancada" }), acao)}
        >
          <Printer aria-hidden />
          Abrir para imprimir
        </a>
        <a
          href={linkWhatsapp(telefoneCliente, mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "secondary", size: "bancada" }), acao)}
        >
          <MessageCircle aria-hidden />
          Enviar no WhatsApp
          {semTelefone && (
            <span className="ml-auto text-sm font-normal text-texto-secundario">
              Cliente sem telefone: escolha o contato
            </span>
          )}
        </a>
        <a
          href={`${base}/etiqueta?imprimir=1`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "secondary", size: "bancada" }), acao)}
        >
          <QrCode aria-hidden />
          Imprimir etiqueta com QR
        </a>
      </div>

      <p className="text-sm text-texto-secundario">
        No WhatsApp, anexe o PDF baixado à conversa. A mensagem já leva o link de acompanhamento da
        OS.
      </p>

      <div className="flex flex-wrap gap-3 border-t border-borda pt-4">
        <Link
          href={base}
          className={cn(buttonVariants({ variant: "outline", size: "bancada" }), "h-12")}
        >
          <ExternalLink aria-hidden />
          Abrir a OS
        </Link>
        <Link
          href={`/${slug}/os/nova`}
          className={cn(buttonVariants({ variant: "outline", size: "bancada" }), "h-12")}
        >
          <Plus aria-hidden />
          Nova OS
        </Link>
      </div>
    </section>
  );
}
