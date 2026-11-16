# WL Retífica ERP

Sistema de gestão de clientes e Ordens de Serviço para retíficas de motores (SaaS multi-retífica). Cliente piloto: **WL Retífica de Motores**.

- Produto e regras: [`docs/SPEC.md`](docs/SPEC.md)
- Banco, funções e segurança (RLS): [`docs/BANCO.md`](docs/BANCO.md)
- Telas de referência: [`docs/design/`](docs/design/) e o canvas de design
- Como os agentes de IA trabalham neste repositório: [`CLAUDE.md`](CLAUDE.md) e [`docs/AGENTES.md`](docs/AGENTES.md)

## O que já funciona (Fase 1 — MVP)

| Módulo | Rotas |
|---|---|
| Login, convite, empresa ativa, 4 perfis (dono, balcão, técnico, financeiro) | `/login`, `/convite/[token]`, `/[empresa]/...` |
| Início por perfil + painel do dono | `/[empresa]/inicio` |
| Busca global (cliente, placa, motor, nº da OS) | `/` ou `Ctrl+K` em qualquer tela |
| Clientes (lojista/final) e ficha com histórico | `/[empresa]/clientes`, `/[empresa]/clientes/[id]` |
| Motores e histórico por motor/placa | `/[empresa]/motores`, `/[empresa]/motores/[id]` |
| Catálogo: serviços, peças, tabelas de preço, kits | `/[empresa]/catalogo` |
| Nova OS: cliente → motor → checklist → fotos → assinatura → comprovante PDF e etiqueta QR | `/[empresa]/os/nova`, `/[empresa]/os/[id]/recebimento` |
| Quadro de OS (arrastar, tempo real), detalhe, execução, entrega e garantia | `/[empresa]/os`, `/[empresa]/os/[id]` |
| Laudo/medições e orçamento versionado (PDF, WhatsApp) | `/[empresa]/os/[id]/laudo`, `/[empresa]/os/[id]/orcamento` |
| Página do cliente para aprovar o orçamento (sem login) | `/os-publica/[token]` |
| Bancada do técnico (tablet, sem preços, leitor de QR) | `/[empresa]/bancada` |

Fora do MVP (próximas fases): financeiro (Fase 2), estoque/WhatsApp API/portal do lojista (Fase 3), fiscal NF-e/NFS-e (Fase 4).

## Instalação na oficina (offline)

O jeito oficial de rodar na WL: **um computador da oficina** com Supabase self-hosted (Docker Compose), o app em container e HTTPS local pelo Caddy; tablets e celulares acessam pela rede da oficina, **sem internet**. Passo a passo para leigos, backup, restauração e atualização: [`deploy/local/LEIA-ME.md`](deploy/local/LEIA-ME.md).

```bash
# Linux (Windows: deploy\local\scripts\windows\instalar.bat)
sudo deploy/local/scripts/linux/instalar.sh
```

## Opcional: nuvem (Supabase + Vercel)


1. **Supabase** — crie um projeto (região São Paulo, `sa-east-1`).
2. **Banco** — com a [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase link --project-ref <ref-do-projeto>
   supabase db push          # aplica supabase/migrations/
   ```
   Não rode `supabase/seed.sql` em produção: ele cria usuários de teste.
3. **Auth** (painel do Supabase → Authentication → URL Configuration): `Site URL` = URL do app; em *Redirect URLs* adicione `https://<seu-dominio>/auth/callback`.
4. **Vercel** — importe o repositório e configure as variáveis (modelo em `.env.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (só servidor), `NEXT_PUBLIC_SITE_URL`.
5. **Primeira empresa** — crie o usuário do dono (Authentication → Users), entre no app com ele e chame `criar_empresa('WL Retífica de Motores', 'wl-retifica', '<nome do dono>')` (via `supabase.rpc` logado como esse usuário; veja `docs/BANCO.md`). A função cria a empresa, torna o usuário dono e copia o checklist padrão e o catálogo de exemplo. Os demais usuários entram por convite.

## Desenvolvimento

```bash
pnpm install
cp .env.example .env.local    # preencha com um projeto Supabase de desenvolvimento
pnpm dev
```

Checks (todos precisam passar antes de integrar):

```bash
./scripts/db-local.sh         # Postgres local na porta 54322 (ou ajuste PGHOST/PGPORT)
pnpm lint && pnpm typecheck && pnpm test && pnpm test:db && pnpm build
```

`pnpm test:db` recria um banco de teste, aplica um *shim* que simula `auth.*` do Supabase, todas as migrations, o seed e roda os testes SQL de RLS e regras de negócio (`supabase/tests/`).

### Limitações conhecidas
- O ambiente onde o MVP foi construído não tinha Supabase Auth/PostgREST/Storage rodando: banco, regras e telas foram validados por testes SQL, testes unitários, tipos e build, **mas os fluxos ainda não foram clicados de ponta a ponta**. Faça uma rodada de testes manuais no primeiro ambiente com Supabase real (roteiro em `docs/TESTE-MANUAL.md`).
- A logo atual foi recortada de uma imagem; substitua `public/brand/` pelos arquivos originais em alta resolução quando disponíveis.
