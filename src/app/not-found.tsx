import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4">
      <EmptyState
        className="w-full"
        icone={<SearchX aria-hidden />}
        titulo="Página não encontrada"
        descricao="O endereço não existe ou você não tem acesso a ele."
        acoes={
          <Button asChild>
            <Link href="/">Ir para o início</Link>
          </Button>
        }
      />
    </main>
  );
}
