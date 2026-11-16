import { AppShell } from "@/components/app/app-shell";
import { EmpresaProvider } from "@/lib/auth/empresa-context";
import { obterContextoEmpresa } from "@/lib/auth/sessao";

/**
 * Valida no servidor que o usuário é membro ativo da empresa do slug (senão
 * 404) e expõe empresa, membro/papel e config via <EmpresaProvider>.
 * Em Server Components use obterContextoEmpresa(slug) (memoizado).
 */
export default async function EmpresaLayout({ children, params }: LayoutProps<"/[empresa]">) {
  const { empresa: slug } = await params;
  const contexto = await obterContextoEmpresa(slug);
  return (
    <EmpresaProvider valor={contexto}>
      <AppShell>{children}</AppShell>
    </EmpresaProvider>
  );
}
