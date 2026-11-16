"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rotaDaEtiqueta } from "@/lib/os/qr";

type DetectorLike = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => DetectorLike;

/** Lê o QR da etiqueta pela câmera (BarcodeDetector; fallback @zxing) e abre a OS. */
export function LeitorQr({ slug }: { slug: string }) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (!aberto) return;
    let parar = false;
    let fluxo: MediaStream | null = null;
    let pararZxing: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function aoLer(texto: string) {
      const rota = rotaDaEtiqueta(texto, slug, window.location.origin);
      if (!rota || parar) return false;
      parar = true;
      setAberto(false);
      router.push(rota);
      return true;
    }

    async function iniciar() {
      setErro(null);
      const video = videoRef.current;
      if (!video || !navigator.mediaDevices?.getUserMedia) {
        setErro("Este aparelho não permite usar a câmera aqui.");
        return;
      }
      try {
        const Detector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
        if (Detector) {
          fluxo = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
          });
          video.srcObject = fluxo;
          await video.play();
          const detector = new Detector({ formats: ["qr_code"] });
          const ciclo = async () => {
            if (parar) return;
            try {
              const r = await detector.detect(video);
              if (r.some((c) => aoLer(c.rawValue))) return;
            } catch {
              // quadro ainda sem imagem
            }
            timer = setTimeout(ciclo, 250);
          };
          void ciclo();
        } else {
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          const leitor = new BrowserQRCodeReader();
          const controles = await leitor.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } } },
            video,
            (resultado) => {
              if (resultado) aoLer(resultado.getText());
            },
          );
          pararZxing = () => controles.stop();
        }
      } catch {
        setErro("Não foi possível abrir a câmera. Libere a permissão no navegador.");
      }
    }
    void iniciar();

    return () => {
      parar = true;
      clearTimeout(timer);
      pararZxing?.();
      fluxo?.getTracks().forEach((t) => t.stop());
    };
  }, [aberto, slug, router]);

  return (
    <>
      <Button
        type="button"
        size="bancada"
        className="h-[52px] border border-preto-borda bg-preto-2 text-base text-white hover:bg-preto-borda"
        onClick={() => setAberto(true)}
        aria-label="Ler QR da etiqueta"
      >
        <ScanLine aria-hidden /> Ler etiqueta
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ler etiqueta da OS</DialogTitle>
            <DialogDescription>Aponte a câmera para o QR da etiqueta do motor.</DialogDescription>
          </DialogHeader>
          <video ref={videoRef} muted playsInline className="aspect-square w-full rounded-xl bg-preto object-cover" />
          {erro && (
            <p className="rounded-lg bg-perigo-suave p-3 text-sm text-perigo" role="alert">
              {erro}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
