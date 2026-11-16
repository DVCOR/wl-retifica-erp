-- =============================================================================
-- Orçamento versionado
-- =============================================================================

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  os_id uuid not null,
  versao integer not null,                       -- definido por trigger (max + 1)
  status public.orcamento_status not null default 'rascunho',
  subtotal numeric(12, 2) not null default 0,    -- recalculado por trigger
  desconto numeric(12, 2) not null default 0 check (desconto >= 0),   -- desconto no total
  total numeric(12, 2) not null default 0,       -- recalculado por trigger
  validade date,
  desconto_aprovado_por uuid,                    -- dono que liberou desconto acima do limite
  criado_por uuid,
  enviado_em timestamptz,
  respondido_em timestamptz,
  respondido_por_nome text,
  respondido_ip text,
  canal public.canal,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id),
  unique (os_id, versao),
  foreign key (os_id, empresa_id) references public.os (id, empresa_id) on delete cascade,
  foreign key (desconto_aprovado_por, empresa_id) references public.membros (id, empresa_id) on delete set null (desconto_aprovado_por),
  foreign key (criado_por, empresa_id) references public.membros (id, empresa_id) on delete set null (criado_por)
);

-- Só uma versão aprovada por OS.
create unique index orcamentos_um_aprovado on public.orcamentos (os_id) where status = 'aprovado';
create index orcamentos_empresa_status_idx on public.orcamentos (empresa_id, status, respondido_em);

create trigger orcamentos_updated_at before update on public.orcamentos
  for each row execute function public.tg_set_updated_at();

alter table public.os
  add constraint os_orcamento_aprovado_fk foreign key (orcamento_aprovado_id, empresa_id)
  references public.orcamentos (id, empresa_id) on delete set null (orcamento_aprovado_id);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  orcamento_id uuid not null,
  tipo public.item_tipo not null,
  servico_id uuid,
  peca_id uuid,
  descricao text not null,
  quantidade numeric(10, 2) not null default 1 check (quantidade > 0),
  preco_unitario numeric(12, 2) check (preco_unitario is null or preco_unitario >= 0),  -- null = preço sugerido pela tabela
  desconto numeric(12, 2) not null default 0 check (desconto >= 0),
  total numeric(12, 2) not null default 0,       -- calculado por trigger
  ordem integer not null default 0,
  sugerido_por_medicao_id uuid,
  sugerido_por uuid,                             -- membro (técnico) que sugeriu
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id),
  check ((tipo = 'servico' and peca_id is null) or (tipo = 'peca' and servico_id is null)),
  foreign key (orcamento_id, empresa_id) references public.orcamentos (id, empresa_id) on delete cascade,
  foreign key (servico_id, empresa_id) references public.servicos (id, empresa_id) on delete set null (servico_id),
  foreign key (peca_id, empresa_id) references public.pecas (id, empresa_id) on delete set null (peca_id),
  foreign key (sugerido_por_medicao_id, empresa_id) references public.os_medicoes (id, empresa_id) on delete set null (sugerido_por_medicao_id),
  foreign key (sugerido_por, empresa_id) references public.membros (id, empresa_id) on delete set null (sugerido_por)
);

create index orcamento_itens_orcamento_idx on public.orcamento_itens (orcamento_id, ordem);
create trigger orcamento_itens_updated_at before update on public.orcamento_itens
  for each row execute function public.tg_set_updated_at();
