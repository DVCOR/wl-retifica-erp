import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";
import type { OsLinha } from "@/lib/inicio/agregacoes";
import { formatarData } from "@/lib/format";

/** Cartão de número do painel (valor calculado no servidor). */
export function CartaoNumero({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  className,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  tom?: "neutro" | "perigo" | "sucesso";
  className?: string;
}) {
  return (
    <Card className={cn("gap-1 p-4", className)}>
      <p className="text-sm font-medium text-texto-secundario">{rotulo}</p>
      <p
        className={cn(
          "text-[28px] leading-tight font-bold tabular-nums",
          tom === "perigo" && "text-perigo",
          tom === "sucesso" && "text-sucesso",
        )}
      >
        {valor}
      </p>
      {detalhe && <p className="text-sm text-texto-secundario">{detalhe}</p>}
    </Card>
  );
}

/** Bloco com título, contagem e lista (ou estado vazio). */
export function BlocoLista({
  titulo,
  vazio,
  total,
  children,
}: {
  titulo: string;
  vazio: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{titulo}</CardTitle>
        <span className="rounded-full bg-fundo px-2.5 py-0.5 text-sm font-semibold tabular-nums">
          {total}
        </span>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="rounded-lg bg-fundo px-4 py-6 text-center text-[15px] text-texto-secundario">
            {vazio}
          </p>
        ) : (
          <ul className="divide-y divide-borda">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Linha de OS clicável (≥ 48px de altura). */
export function LinhaOs({
  slug,
  os,
  extra,
  href,
}: {
  slug: string;
  os: OsLinha;
  extra?: React.ReactNode;
  href?: string;
}) {
  return (
    <li>
      <Link
        href={href ?? `/${slug}/os/${os.id}`}
        className="-mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 hover:bg-fundo"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">OS {os.numero}</span>
          <span className="block truncate text-sm text-texto-secundario">
            {os.clienteNome ?? "Cliente"}
            {os.prazo ? ` · prazo ${formatarData(os.prazo)}` : ""}
          </span>
        </span>
        {extra}
        <StatusBadge status={os.status} className="hidden sm:inline-flex" />
        <ChevronRight className="size-4 shrink-0 text-texto-secundario" aria-hidden />
      </Link>
    </li>
  );
}
