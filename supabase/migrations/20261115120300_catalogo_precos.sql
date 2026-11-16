-- =============================================================================
-- Catálogo de serviços, peças, tabelas de preço e kits
-- =============================================================================

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  codigo text,
  nome text not null check (length(trim(nome)) > 0),
  categoria text,
  unidade public.unidade_servico not null default 'un',
  preco_base numeric(12, 2) not null default 0 check (preco_base >= 0),
  tempo_padrao_min integer check (tempo_padrao_min is null or tempo_padrao_min >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create unique index servicos_codigo_unico on public.servicos (empresa_id, codigo) where codigo is not null;
create index servicos_empresa_nome_idx on public.servicos (empresa_id, nome);
create trigger servicos_updated_at before update on public.servicos
  for each row execute function public.tg_set_updated_at();

create table public.pecas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  codigo text,
  descricao text not null check (length(trim(descricao)) > 0),
  marca text,
  unidade text not null default 'un',
  custo numeric(12, 2) check (custo is null or custo >= 0),
  preco_venda numeric(12, 2) not null default 0 check (preco_venda >= 0),
  ativo boolean not null default true,
  -- Fase 3: estoque_atual, estoque_minimo · Fase 4: ncm, cfop, cest
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create unique index pecas_codigo_unico on public.pecas (empresa_id, codigo) where codigo is not null;
create index pecas_empresa_descricao_idx on public.pecas (empresa_id, descricao);
create trigger pecas_updated_at before update on public.pecas
  for each row execute function public.tg_set_updated_at();

create table public.tabelas_preco (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  desconto_padrao_pct numeric(5, 2) not null default 0 check (desconto_padrao_pct between 0 and 100),
  padrao_para public.cliente_tipo,  -- tabela usada por padrão para este tipo de cliente
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create unique index tabelas_preco_padrao_unico on public.tabelas_preco (empresa_id, padrao_para)
  where padrao_para is not null and ativo;
create trigger tabelas_preco_updated_at before update on public.tabelas_preco
  for each row execute function public.tg_set_updated_at();

create table public.tabela_preco_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tabela_preco_id uuid not null,
  servico_id uuid,
  peca_id uuid,
  preco numeric(12, 2) not null check (preco >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(servico_id, peca_id) = 1),
  foreign key (tabela_preco_id, empresa_id) references public.tabelas_preco (id, empresa_id) on delete cascade,
  foreign key (servico_id, empresa_id) references public.servicos (id, empresa_id) on delete cascade,
  foreign key (peca_id, empresa_id) references public.pecas (id, empresa_id) on delete cascade
);

create unique index tabela_preco_itens_servico_unico on public.tabela_preco_itens (tabela_preco_id, servico_id)
  where servico_id is not null;
create unique index tabela_preco_itens_peca_unico on public.tabela_preco_itens (tabela_preco_id, peca_id)
  where peca_id is not null;
create trigger tabela_preco_itens_updated_at before update on public.tabela_preco_itens
  for each row execute function public.tg_set_updated_at();

create table public.kits (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create trigger kits_updated_at before update on public.kits
  for each row execute function public.tg_set_updated_at();

create table public.kit_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  kit_id uuid not null,
  servico_id uuid,
  peca_id uuid,
  quantidade numeric(10, 2) not null default 1 check (quantidade > 0),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(servico_id, peca_id) = 1),
  foreign key (kit_id, empresa_id) references public.kits (id, empresa_id) on delete cascade,
  foreign key (servico_id, empresa_id) references public.servicos (id, empresa_id) on delete cascade,
  foreign key (peca_id, empresa_id) references public.pecas (id, empresa_id) on delete cascade
);

create index kit_itens_kit_idx on public.kit_itens (kit_id);

-- clientes.tabela_preco_id (a tabela de preço é criada depois de clientes)
alter table public.clientes
  add constraint clientes_tabela_preco_fk foreign key (tabela_preco_id, empresa_id)
  references public.tabelas_preco (id, empresa_id) on delete set null (tabela_preco_id);
