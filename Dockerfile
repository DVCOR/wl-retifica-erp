# syntax=docker/dockerfile:1
# =============================================================================
# Imagem do app (Next.js standalone) para a instalação local na oficina.
# Uso: deploy/local/docker-compose.yml (serviço `app`). Veja deploy/local/LEIA-ME.md.
#
# A imagem NÃO depende do endereço da oficina nem das chaves: o build usa
# marcadores (WL_HOST_MARCADOR / WL_ANON_MARCADOR) no lugar das variáveis
# NEXT_PUBLIC_*, e o deploy/local/app-entrypoint.sh troca os marcadores pelos
# valores do .env quando o container sobe. Assim a mesma imagem pode ser gerada
# num PC com internet e levada para a oficina num pendrive.
# =============================================================================

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------------- dependências
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------- build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Marcadores trocados em tempo de execução (ver app-entrypoint.sh).
# NEXT_PUBLIC_MODO_LOCAL=true liga o modo da oficina no app (login só com
# usuário/senha, usuários criados pelo dono, sem link público).
ENV NEXT_PUBLIC_MODO_LOCAL=true \
    NEXT_PUBLIC_SUPABASE_URL=https://wl-host-marcador.invalid \
    NEXT_PUBLIC_SITE_URL=https://wl-host-marcador.invalid \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=wl-anon-key-marcador
RUN pnpm build

# ---------------------------------------------------------------- execução
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /app /app-modelo \
 && chown nextjs:nodejs /app
WORKDIR /app

# Cópia "modelo" intocada; /app recebe a cópia com os valores reais.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone /app-modelo/
COPY --from=build --chown=nextjs:nodejs /app/.next/static /app-modelo/.next/static
COPY --from=build --chown=nextjs:nodejs /app/public /app-modelo/public
COPY --chmod=755 deploy/local/app-entrypoint.sh /usr/local/bin/app-entrypoint.sh

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["/usr/local/bin/app-entrypoint.sh"]
CMD ["node", "server.js"]
