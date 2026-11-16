import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { exigirUsuario } from "@/lib/auth/sessao";
import { sair } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Sem empresa" };

export default async function SemEmpresaPage() {
  const usuario = await exigirUsuario();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4">
      <EmptyState
        className="w-full"
        icone={<Building2 aria-hidden />}
        titulo="Você ainda não faz parte de nenhuma retífica"
        descricao={`Peça ao dono da retífica um convite para ${usuario.email ?? "o seu e-mail"}.`}
        acoes={
          <form action={sair}>
            <Button type="submit" variant="secondary">
              Sair
            </Button>
          </form>
        }
      />
    </main>
  );
}
