import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { modoLocal } from "@/lib/modo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function EsqueciSenhaPage() {
  const local = modoLocal();
  return (
    <>
      <h1 className="text-xl font-bold">Esqueci minha senha</h1>
      <p className="mt-3 mb-6 text-[15px] text-texto">
        {local
          ? "Peça ao dono para redefinir sua senha."
          : "Na tela de entrada, use a aba “Receber link” para acessar pelo e-mail e depois troque a senha com o dono da empresa."}
      </p>
      {local && (
        <p className="mb-6 text-sm text-texto-secundario">
          O dono faz isso em Configurações, Usuários, “Redefinir senha”.
        </p>
      )}
      <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        Voltar para o login
      </Link>
    </>
  );
}
