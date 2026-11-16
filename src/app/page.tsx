import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exigirUsuario, listarEmpresasDoUsuario } from "@/lib/auth/sessao";
import { COOKIE_EMPRESA } from "@/lib/auth/rotas";

/** "/" -> última empresa usada (cookie) ou a primeira do usuário. */
export default async function Raiz() {
  await exigirUsuario();
  const empresas = await listarEmpresasDoUsuario();
  if (empresas.length === 0) redirect("/sem-empresa");
  const preferida = (await cookies()).get(COOKIE_EMPRESA)?.value;
  const destino = empresas.find((e) => e.slug === preferida) ?? empresas[0]!;
  redirect(`/${destino.slug}/inicio`);
}
