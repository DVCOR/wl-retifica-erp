-- =============================================================================
-- Templates de checklist (por empresa) + modelo padrão global
-- =============================================================================

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  tipo_conjunto text not null default 'motor_completo',  -- motor_completo, cabecote, ...
  padrao boolean not null default false,                 -- template sugerido na Nova OS
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create unique index checklist_templates_padrao_unico on public.checklist_templates (empresa_id)
  where padrao and ativo;
create trigger checklist_templates_updated_at before update on public.checklist_templates
  for each row execute function public.tg_set_updated_at();

create table public.checklist_template_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  template_id uuid not null,
  grupo text not null,
  descricao text not null,
  ordem integer not null default 0,
  exige_quantidade boolean not null default false,
  quantidade_padrao numeric(10, 2),
  created_at timestamptz not null default now(),
  foreign key (template_id, empresa_id) references public.checklist_templates (id, empresa_id) on delete cascade
);

create index checklist_template_itens_template_idx on public.checklist_template_itens (template_id, ordem);

-- Modelo global (sem empresa): copiado para cada empresa nova por
-- inicializar_empresa(). Somente leitura para os usuários.
create table public.modelo_checklist_itens (
  id serial primary key,
  grupo text not null,
  descricao text not null,
  ordem integer not null,
  exige_quantidade boolean not null default false,
  quantidade_padrao numeric(10, 2)
);

create table public.modelo_servicos (
  id serial primary key,
  codigo text not null unique,
  nome text not null,
  categoria text not null,
  unidade public.unidade_servico not null default 'un',
  preco_base numeric(12, 2) not null default 0,
  tempo_padrao_min integer
);
