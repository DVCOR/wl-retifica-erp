import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { proximo, erro } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-bold">Entrar</h1>
      <p className="mt-1 mb-5 text-[15px] text-texto-secundario">Acesse o sistema da retífica.</p>
      {erro === "link" && (
        <p role="alert" className="mb-4 rounded-lg bg-perigo-suave px-3 py-2.5 text-sm font-medium text-perigo">
          O link expirou ou já foi usado. Peça outro.
        </p>
      )}
      <LoginForm proximo={typeof proximo === "string" ? proximo : undefined} />
    </>
  );
}
