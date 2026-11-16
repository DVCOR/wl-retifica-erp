# Padrão de acesso a dados

Exemplo real completo: **Configurações** —
`src/lib/data/empresa.ts` (leitura) + `src/app/(app)/[empresa]/configuracoes/{page.tsx,actions.ts,form-dados-empresa.tsx}` (escrita) + `src/lib/validacoes/empresa.ts` (schema).

## 1. Leitura: funções server-only por módulo

Arquivo `src/lib/data/<modulo>.ts`, começa com `import "server-only"`.

```ts
import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function listarClientes(empresaId: string, filtro?: { tipo?: "lojista" | "final" }) {
  const supabase = await criarClienteServidor(); // sessão do usuário → RLS vale
  let q = supabase
    .from("clientes")
    .select("id, nome, tipo, telefone_whatsapp")
    .eq("empresa_id", empresaId);
  if (filtro?.tipo) q = q.eq("tipo", filtro.tipo);
  const { data, error } = await q.order("nome");
  if (error) throw new Error(`Erro ao listar clientes: ${error.message}`);
  return data;
}
```

- Sempre filtre por `empresa_id` (a RLS já impede vazamento entre empresas, mas o filtro evita trazer dados de outra empresa em que o usuário também é membro).
- Tipos vêm de `src/lib/supabase/types.ts` (gerado: `pnpm test:db && pnpm db:types`).
- **Preço e técnico**: técnico não lê `servicos`, `pecas`, `tabelas_preco`, `tabela_preco_itens`, `orcamentos`, `orcamento_itens` (a não ser com `config.tecnico_ve_precos`). Para telas que o técnico abre, use as views `v_servicos_catalogo`, `v_pecas_catalogo`, `v_orcamento_itens_sem_preco`. Para decidir na UI: `podeVerPrecos(papel, config)`.
- Nunca use `criarClienteAdmin()` (service role) para contornar RLS em tela logada.

## 2. Página (Server Component)

```tsx
export default async function Pagina({ params }: PageProps<"/[empresa]/clientes">) {
  const { empresa: slug } = await params;
  const { empresa, membro } = await obterContextoEmpresa(slug); // valida membro; memoizado
  if (!pode(membro.papel, "clientes.ver")) return <SemAcesso slug={slug} />;
  const clientes = await listarClientes(empresa.id);
  return (
    <>
      <PageHeader titulo="Clientes" /> ...{" "}
    </>
  );
}
```

Em componentes cliente: `useEmpresa()` (empresa, membro, config) e `usePermissao()` (`pode(acao)`, `vePrecos`).

## 3. Escrita: Server Actions em `actions.ts` na pasta da rota

```ts
"use server";
export async function criarCliente(
  slug: string,
  entrada: unknown,
): Promise<ResultadoAcao<{ id: string }>> {
  const dados = clienteSchema.safeParse(entrada); // 1. zod (src/lib/validacoes/<modulo>.ts)
  if (!dados.success) return falhaValidacao(dados.error);
  const { empresa, membro } = await obterContextoEmpresa(slug); // 2. empresa ativa + papel
  if (!pode(membro.papel, "clientes.cadastrar")) return falha("Sem permissão.");
  const supabase = await criarClienteServidor(); // 3. grava com a sessão (RLS)
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...dados.data, empresa_id: empresa.id })
    .select("id")
    .single();
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath(`/${slug}/clientes`); // 4. revalida
  return sucesso({ id: data.id }); // 5. ResultadoAcao
}
```

Regras:

- Entrada sempre `unknown` + zod; o mesmo schema é usado no formulário (`zodResolver`).
- Nunca confie em `empresa_id` vindo do cliente: use `obterContextoEmpresa(slug).empresa.id`.
- Não lance erro para o cliente: devolva `ResultadoAcao` (`src/lib/acao.ts`). `mensagemErroBanco()` traduz erros do Postgres; as funções SQL já levantam mensagens em pt-BR (errcode `P0001`).
- Update/delete bloqueado pela RLS **não dá erro**, só afeta 0 linhas: use `.select("id")` e confira o tamanho.
- Fluxos com regra no banco usam RPC, não update direto:
  `criar_os`, `alterar_status_os`, `enviar_orcamento`, `responder_orcamento`, `adicionar_kit_orcamento`, `regenerar_token_publico`, `aceitar_convite`, `buscar`. Ver `docs/BANCO.md`.
- Técnico inserindo item sugerido em orçamento: `insert` **sem** `.select()` (ele não pode ler a linha de volta).

## 4. Formulário (Client Component)

`react-hook-form` + `zodResolver(schema)` + helpers de `@/components/ui/form`; chame a action dentro de `useTransition`, mostre `toast.success` no ok e `<FormErro>` no erro. Ver `form-dados-empresa.tsx`.

## 5. Onde fica cada coisa

| O quê                 | Onde                                        |
| --------------------- | ------------------------------------------- |
| Leitura do módulo     | `src/lib/data/<modulo>.ts`                  |
| Schemas zod           | `src/lib/validacoes/<modulo>.ts`            |
| Server Actions        | `src/app/(app)/[empresa]/<rota>/actions.ts` |
| Componentes do módulo | `src/components/<modulo>/`                  |
| Testes de regra pura  | `*.test.ts` ao lado (Vitest)                |
