import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { montarMedicaoPdf, OrcamentoPdf } from "@/components/orcamento/orcamento-pdf";
import { pode } from "@/lib/auth/permissoes";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import {
  listarItensOrcamento,
  listarMedicoes,
  listarVersoes,
  obterEmpresaPdf,
  obterOsOrcamento,
} from "@/lib/data/orcamento";
import { formatarNumeroOs, formatarPlaca, formatarTelefone } from "@/lib/format";
import { formatarEnderecoEmpresa } from "@/lib/recebimento/endereco";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /[empresa]/os/[id]/orcamento/pdf[?laudo=1][&versao=N][&baixar=1] */
export async function GET(request: Request, { params }: RouteContext<"/[empresa]/os/[id]/orcamento/pdf">) {
  const { empresa: slug, id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("OS inválida", { status: 404 });
  const { empresa, membro } = await obterContextoEmpresa(slug);
  if (!pode(membro.papel, "orcamento.montar")) return new Response("Sem permissão", { status: 403 });

  const os = await obterOsOrcamento(empresa.id, id);
  if (!os) return new Response("OS não encontrada", { status: 404 });
  const url = new URL(request.url);
  const versaoPedida = Number(url.searchParams.get("versao"));
  const versoes = await listarVersoes(empresa.id, id);
  const orc = versaoPedida ? versoes.find((v) => v.versao === versaoPedida) : versoes[0];
  if (!orc) return new Response("Esta OS ainda não tem orçamento", { status: 404 });

  const [itens, dadosEmpresa, medicoes, logo] = await Promise.all([
    listarItensOrcamento(empresa.id, orc.id),
    obterEmpresaPdf(empresa.id),
    url.searchParams.get("laudo") === "1" ? listarMedicoes(empresa.id, id) : Promise.resolve(null),
    readFile(path.join(process.cwd(), "public", "brand", "wl-logo.png")).catch(() => null),
  ]);

  const endereco = formatarEnderecoEmpresa(
    (dadosEmpresa?.endereco ?? null) as Record<string, string | undefined> | null,
  );
  const contato = [formatarTelefone(dadosEmpresa?.telefone), dadosEmpresa?.email]
    .filter(Boolean)
    .join(" · ");

  const numero = formatarNumeroOs(os.numero);
  const pdf = await renderToBuffer(
    createElement(OrcamentoPdf, {
      dados: {
        empresa: { nome: dadosEmpresa?.nome_fantasia ?? empresa.nome_fantasia, endereco, contato },
        logo,
        os: {
          numero,
          cliente: os.cliente.nome,
          motor: os.motor
            ? [os.motor.marca, os.motor.modelo, os.motor.codigo_motor].filter(Boolean).join(" ")
            : "",
          placa: os.motor?.veiculo_placa ? formatarPlaca(os.motor.veiculo_placa) : "",
        },
        orcamento: {
          versao: orc.versao,
          status: orc.status,
          validade: orc.validade,
          observacoes: orc.observacoes,
          subtotal: Number(orc.subtotal),
          desconto: Number(orc.desconto),
          total: Number(orc.total),
          itens: itens.map((i) => ({
            descricao: i.descricao,
            quantidade: Number(i.quantidade),
            preco_unitario: Number(i.preco_unitario ?? 0),
            desconto: Number(i.desconto),
            total: Number(i.total),
          })),
        },
        medicoes: medicoes
          ? medicoes.map((m) =>
              montarMedicaoPdf({
                ...m,
                valor: m.valor === null ? null : Number(m.valor),
                minimo: m.minimo === null ? null : Number(m.minimo),
                maximo: m.maximo === null ? null : Number(m.maximo),
              }),
            )
          : null,
      },
    }) as Parameters<typeof renderToBuffer>[0],
  );

  const baixar = url.searchParams.get("baixar") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="orcamento-os-${os.numero}-v${orc.versao}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
