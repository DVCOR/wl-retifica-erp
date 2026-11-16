import QRCode from "qrcode";
import { z } from "zod";
import { obterContextoEmpresa } from "@/lib/auth/sessao";
import { obterClienteParaOs } from "@/lib/data/recebimento";
import { criarClienteServidor } from "@/lib/supabase/server";
import { gerarHtmlEtiqueta } from "@/lib/recebimento/etiqueta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /[empresa]/os/[id]/etiqueta[?imprimir=1] — etiqueta 60×40 mm com QR da OS. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/[empresa]/os/[id]/etiqueta">,
) {
  const { empresa: slug, id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("OS inválida", { status: 404 });
  const { empresa } = await obterContextoEmpresa(slug);

  const supabase = await criarClienteServidor();
  const { data: os } = await supabase
    .from("os")
    .select("id, numero, cliente_id")
    .eq("empresa_id", empresa.id)
    .eq("id", id)
    .maybeSingle();
  if (!os) return new Response("OS não encontrada", { status: 404 });
  const cliente = await obterClienteParaOs(empresa.id, os.cliente_id);

  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const qr = await QRCode.toDataURL(`${base.replace(/\/$/, "")}/${slug}/os/${os.id}`, {
    margin: 0,
    width: 360,
    errorCorrectionLevel: "M",
  });

  const html = gerarHtmlEtiqueta({
    numeroOs: os.numero,
    cliente: cliente?.nome ?? "",
    empresa: empresa.nome_fantasia,
    qrDataUrl: qr,
    imprimirAoAbrir: url.searchParams.get("imprimir") === "1",
  });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
