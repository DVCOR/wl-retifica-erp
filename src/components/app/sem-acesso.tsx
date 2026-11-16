import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Mostrado quando o papel do usuário não permite a página. */
export function SemAcesso({ slug }: { slug: string }) {
  return (
    <EmptyState
      icone={<Lock aria-hidden />}
      titulo="Sem acesso"
      descricao="Seu papel nesta empresa não permite abrir esta tela. Fale com o dono se precisar."
      acoes={
        <Button asChild variant="secondary">
          <Link href={`/${slug}/inicio`}>Voltar ao início</Link>
        </Button>
      }
    />
  );
}
