"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { podeMoverOs, pode, TRANSICOES_OS, type OsStatus, type Papel } from "@/lib/auth/permissoes";
import { STATUS_OS } from "@/lib/os/status";
import { cancelarOsAction, moverStatusAction } from "@/app/(app)/[empresa]/os/actions";

type Props = {
  slug: string;
  osId: string;
  status: OsStatus;
  papel: Papel;
  atribuidaAoMembro: boolean;
};

/** Botões de mudança de status permitidos ao papel (+ cancelar com motivo). */
export function AcoesStatus({ slug, osId, status, papel, atribuidaAoMembro }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = React.useTransition();
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [cancelando, setCancelando] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");
  const [erroMotivo, setErroMotivo] = React.useState<string | null>(null);

  const destinos = TRANSICOES_OS[status].filter(
    (s) =>
      s !== "cancelado" &&
      s !== "entregue" &&
      podeMoverOs(papel, status, s, { atribuidaAoMembro }),
  );

  function mover(para: OsStatus) {
    iniciar(async () => {
      const r = await moverStatusAction(slug, osId, { status: para });
      if (!r.ok) {
        setAviso(r.erro);
        return;
      }
      toast.success(`OS movida para ${STATUS_OS[para].rotulo}.`);
      router.refresh();
    });
  }

  function cancelar() {
    iniciar(async () => {
      const r = await cancelarOsAction(slug, osId, { motivo });
      if (!r.ok) {
        setErroMotivo(r.campos?.motivo?.[0] ?? r.erro);
        return;
      }
      setCancelando(false);
      toast.success("OS cancelada.");
      router.refresh();
    });
  }

  const podeCancelar =
    pode(papel, "os.cancelar") && TRANSICOES_OS[status].includes("cancelado");

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {destinos.map((s, i) => (
          <Button
            key={s}
            variant={i === 0 ? "default" : "outline"}
            disabled={pendente}
            onClick={() => mover(s)}
          >
            {i === 0 ? "Avançar para" : "Mover para"} {STATUS_OS[s].rotulo}
          </Button>
        ))}
        {status === "em_recebimento" && pode(papel, "os.checklist") && (
          <Button asChild>
            <Link href={`/${slug}/os/${osId}/recebimento`}>Continuar recebimento</Link>
          </Button>
        )}
        {podeCancelar && (
          <Button variant="ghost" className="text-perigo" onClick={() => setCancelando(true)}>
            Cancelar OS
          </Button>
        )}
      </div>

      <Dialog open={!!aviso} onOpenChange={(o) => !o && setAviso(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Falta alguma coisa</DialogTitle>
            <DialogDescription>O status não foi alterado.</DialogDescription>
          </DialogHeader>
          <p className="rounded-lg bg-alerta-suave p-3 text-[15px]" role="alert">
            {aviso}
          </p>
          <DialogFooter>
            <Button onClick={() => setAviso(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelando} onOpenChange={setCancelando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar esta OS?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. Informe o motivo.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo do cancelamento"
            aria-label="Motivo do cancelamento"
            aria-invalid={!!erroMotivo}
          />
          {erroMotivo && (
            <p className="text-sm text-perigo" role="alert">
              {erroMotivo}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelando(false)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={pendente} onClick={cancelar}>
              Cancelar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
