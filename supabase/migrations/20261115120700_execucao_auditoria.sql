-- =============================================================================
-- Execução (apontamentos) e auditoria
-- =============================================================================

create table public.apontamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  os_id uuid not null,
  orcamento_item_id uuid,
  membro_id uuid not null,
  inicio timestamptz not null default now(),
  fim timestamptz,
  minutos integer generated always as (
    case when fim is null then null else greatest(0, (extract(epoch from (fim - inicio)) / 60)::integer) end
  ) stored,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim is null or fim >= inicio),
  foreign key (os_id, empresa_id) references public.os (id, empresa_id) on delete cascade,
  foreign key (orcamento_item_id, empresa_id) references public.orcamento_itens (id, empresa_id) on delete set null (orcamento_item_id),
  foreign key (membro_id, empresa_id) references public.membros (id, empresa_id)
);

create index apontamentos_os_idx on public.apontamentos (os_id, inicio);
create index apontamentos_membro_aberto_idx on public.apontamentos (membro_id) where fim is null;
create trigger apontamentos_updated_at before update on public.apontamentos
  for each row execute function public.tg_set_updated_at();

create table public.auditoria (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  membro_id uuid,
  user_id uuid,
  tabela text not null,
  registro_id uuid,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz not null default now()
);

create index auditoria_empresa_created_idx on public.auditoria (empresa_id, created_at desc);
create index auditoria_registro_idx on public.auditoria (tabela, registro_id);

-- Fase 2 (reservado, não criar ainda): titulos_receber, faturas_fechamento, fatura_os,
-- titulos_pagar, caixa_movimentos, formas_pagamento.
-- Fase 4: documentos_fiscais.
