import Link from "next/link";
import { FileText } from "lucide-react";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarData, formatarMoeda, formatarPlaca } from "@/lib/format";
import { descricaoMotor } from "@/lib/validacoes/motores";
import type { OsHistorico } from "@/lib/data/clientes";

type Linha = OsHistorico & { cliente?: { id: string; nome: string } | null };

type Props = {
  slug: string;
  os: Linha[];
  vePrecos: boolean;
  /** Mostra a coluna do cliente (histórico por motor). */
  mostrarCliente?: boolean;
  /** Mostra a coluna do motor (omitida na tela do próprio motor). */
  mostrarMotor?: boolean;
  vazio?: { titulo: string; descricao?: string };
};

function Garantia({ os }: { os: Linha }) {
  if (os.eh_garantia) return <Badge variant="perigo">Retorno em garantia</Badge>;
  if (os.garantia_ate) return <span>até {formatarData(os.garantia_ate)}</span>;
  return <span className="text-texto-secundario">—</span>;
}

/** Tabela (desktop) / cartões (celular) de OS, usada na ficha do cliente e no histórico do motor. */
export function TabelaOs({
  slug,
  os,
  vePrecos,
  mostrarCliente = false,
  mostrarMotor = true,
  vazio = { titulo: "Nenhuma OS encontrada" },
}: Props) {
  if (os.length === 0) {
    return (
      <EmptyState
        icone={<FileText aria-hidden />}
        titulo={vazio.titulo}
        descricao={vazio.descricao}
        className="m-4"
      />
    );
  }
  const linkOs = (o: Linha) => `/${slug}/os/${o.id}`;
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS</TableHead>
              <TableHead>Entrada</TableHead>
              {mostrarCliente && <TableHead>Cliente</TableHead>}
              {mostrarMotor && <TableHead>Motor</TableHead>}
              <TableHead>Placa</TableHead>
              <TableHead>Serviços principais</TableHead>
              <TableHead>Status</TableHead>
              {vePrecos && <TableHead className="text-right">Valor</TableHead>}
              <TableHead>Garantia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {os.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-[13px]">
                  <Link
                    href={linkOs(o)}
                    className="inline-flex min-h-11 items-center font-medium text-primaria hover:underline"
                  >
                    {o.numero}
                  </Link>
                </TableCell>
                <TableCell>{formatarData(o.created_at)}</TableCell>
                {mostrarCliente && (
                  <TableCell>
                    {o.cliente ? (
                      <Link href={`/${slug}/clientes/${o.cliente.id}`} className="hover:underline">
                        {o.cliente.nome}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {o.cliente_final_nome && (
                      <span className="block text-sm text-texto-secundario">
                        Cliente do lojista: {o.cliente_final_nome}
                      </span>
                    )}
                  </TableCell>
                )}
                {mostrarMotor && (
                  <TableCell className="font-medium">
                    {o.motor ? (
                      <Link href={`/${slug}/motores/${o.motor.id}`} className="hover:underline">
                        {descricaoMotor(o.motor)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                <TableCell className="font-mono text-[13px]">{formatarPlaca(o.placa)}</TableCell>
                <TableCell className="max-w-64 text-texto-secundario">
                  {o.servicos.length ? o.servicos.join(", ") : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
                {vePrecos && (
                  <TableCell className="text-right font-medium">{formatarMoeda(o.valor)}</TableCell>
                )}
                <TableCell>
                  <Garantia os={o} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="grid gap-2.5 p-4 md:hidden" aria-label="Ordens de serviço">
        {os.map((o) => (
          <li key={o.id}>
            <Link
              href={linkOs(o)}
              className="flex min-h-16 flex-col gap-1.5 rounded-xl border border-borda bg-superficie p-4 active:bg-fundo"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{o.numero}</span>
                <StatusBadge status={o.status} />
              </span>
              {mostrarMotor && (
                <span className="font-medium">
                  {o.motor ? descricaoMotor(o.motor) : "Sem motor"}
                </span>
              )}
              {mostrarCliente && o.cliente && (
                <span className="text-sm text-texto-secundario">{o.cliente.nome}</span>
              )}
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-secundario">
                <span>{formatarData(o.created_at)}</span>
                {o.placa && <span className="font-mono">{formatarPlaca(o.placa)}</span>}
                {vePrecos && o.valor !== null && <span>{formatarMoeda(o.valor)}</span>}
              </span>
              {o.servicos.length > 0 && (
                <span className="text-sm text-texto-secundario">{o.servicos.join(", ")}</span>
              )}
              {(o.eh_garantia || o.garantia_ate) && (
                <span className="text-sm">
                  <Garantia os={o} />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
