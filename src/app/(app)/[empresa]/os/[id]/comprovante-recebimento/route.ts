import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { ComprovantePdf } from "@/components/recebimento/comprovante-pdf";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { obterDadosComprovante } from "@/lib/data/recebimento";
import { montarDadosPdf } from "@/lib/recebimento/comprovante-dados";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /[empresa]/os/[id]/comprovante-recebimento[?baixar=1] — PDF do comprovante. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/[empresa]/os/[id]/comprovante-recebimento">,
) {
  const { empresa: slug, id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("OS inválida", { status: 404 });
  const { empresa } = await obterContextoEmpresa(slug);

  const dados = await obterDadosComprovante(empresa.id, id);
  if (!dados) return new Response("OS não encontrada", { status: 404 });
  if (dados.os.status === "em_recebimento") {
    return new Response("O recebimento ainda não foi concluído.", { status: 409 });
  }

  const logo = await readFile(path.join(process.cwd(), "public", "brand", "wl-logo.png")).catch(
    () => null,
  );
  // ComprovantePdf devolve o <Document> direto (o renderToBuffer exige esse elemento).
  const pdf = await renderToBuffer(ComprovantePdf({ dados: montarDadosPdf(dados, logo) }));

  const baixar = new URL(request.url).searchParams.get("baixar") === "1";
  const nome = `comprovante-recebimento-os-${dados.os.numero}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
