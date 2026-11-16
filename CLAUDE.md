# WL Retífica ERP

SaaS multi-retífica de gestão de clientes e Ordens de Serviço (motor completo). Cliente piloto: WL Retífica de Motores.

**Leia `docs/SPEC.md` antes de qualquer tarefa** — é a fonte de verdade do produto.
Telas de referência (HTML de protótipo): `docs/design/*.dc.html` — siga layout, hierarquia e textos delas.
Divisão de trabalho entre agentes: `docs/AGENTES.md`.

## Stack
Next.js (App Router, Server Components, Server Actions) · TypeScript estrito · Tailwind CSS · componentes no estilo shadcn/ui em `src/components/ui` · Supabase (Postgres + RLS, Auth, Storage, Realtime) via `@supabase/ssr` · zod + react-hook-form · Vitest · pnpm.

## Regras
- TypeScript estrito; nada de `any`. Validação com zod (`src/lib/validacoes/`) em toda entrada de Server Action.
- Toda tabela de negócio tem `empresa_id`, RLS habilitado e políticas; toda política nova tem teste em `supabase/tests/`.
- Banco só muda por migration nova em `supabase/migrations/` (nunca editar migration existente). **Só o agente "dono do banco" cria migrations** (ver `docs/AGENTES.md`).
- Nunca usar service role no código que roda no cliente. Segredos só em variáveis de ambiente (`.env.local`, modelo em `.env.example`).
- UI 100% em pt-BR; BRL; datas dd/mm/aaaa. Responsivo: PC, tablet e smartphone. Alvos de toque ≥ 44px (≥ 48px nas telas de bancada).
- Identidade WL: topo preto `#0E0E10` com faixa vermelha, ação primária vermelha `#C8102E`, cinzas neutros; logo em `public/brand/`. Use os tokens do tema (`src/app/globals.css`), nunca hex soltos em componentes.
- Técnico não vê preços (respeitar `empresas.config.tecnico_ve_precos`).
- Cada módulo fica na sua pasta; código compartilhado só em `src/components/ui`, `src/components/app`, `src/lib`.
- Antes de concluir qualquer tarefa: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:db && pnpm build`.
- Commits pequenos, mensagem em português no imperativo.

## Base (Etapa 1) — leia antes de codar
- Banco, funções RPC e estratégia de RLS/preço: `docs/BANCO.md`. Padrão de dados (server-only + Server Actions + zod): `src/lib/data/README.md`.
- Supabase: `@/lib/supabase/server` (`criarClienteServidor`), `@/lib/supabase/client` (`criarClienteNavegador`), `@/lib/supabase/admin` (service role, só servidor), tipos em `@/lib/supabase/types`.
- Empresa ativa = slug da URL `/[empresa]/...`: `obterContextoEmpresa(slug)` (`@/lib/auth/sessao`) no servidor; `useEmpresa()`/`usePermissao()` (`@/lib/auth/empresa-context`) no cliente. Permissões: `pode(papel, acao)`, `podeVerPrecos`, `podeMoverOs` (`@/lib/auth/permissoes`).
- Layout: `PageHeader`, `StatusBadge`, `EmConstrucao`, `SemAcesso` (`@/components/app`); menu por papel em `src/components/app/nav-itens.ts`.
- Next 16: `middleware` virou `src/proxy.ts`; `params`/`searchParams` são Promises; `PageProps<"/rota">`/`LayoutProps` globais (gerados por `next typegen`, já no `pnpm typecheck`). Cache Components desligado.

## Comandos
- `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `./scripts/db-local.sh` — sobe o Postgres local (porta 54322)
- `pnpm test:db` — recria o banco de teste, aplica `supabase/tests/00_shim_supabase.sql` (simula `auth.*` e papéis do Supabase), todas as migrations e roda os testes SQL de RLS
- `pnpm db:types` — regenera `src/lib/supabase/types.ts` a partir do banco `wl_test` (rode `pnpm test:db` antes)
