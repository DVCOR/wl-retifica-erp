-- =============================================================================
-- Ordem de Serviço e filhos (histórico, checklist, anexos, assinaturas, medições)
-- =============================================================================

create table public.os_sequencias (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  ano integer not null,
  ultimo_numero integer not null default 0,
  primary key (empresa_id, ano)
);

create table public.os (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  numero text not null,                          -- ex.: 2026-000123 (gerado por trigger)
  cliente_id uuid not null,
  motor_id uuid,
  -- cliente do lojista (dono do carro atendido pelo mecânico)
  cliente_final_nome text,
  cliente_final_placa text,
  cliente_final_telefone text,
  status public.os_status not null default 'em_recebimento',
  prazo_prometido date,
  recebido_por uuid,
  tecnico_id uuid,
  checklist_template_id uuid,
  checklist_concluido_em timestamptz,
  os_origem_id uuid,                             -- OS de garantia aponta para a OS original
  eh_garantia boolean generated always as (os_origem_id is not null) stored,
  garantia_dias integer check (garantia_dias is null or garantia_dias >= 0),
  garantia_ate date,
  token_publico uuid not null default gen_random_uuid(),
  orcamento_aprovado_id uuid,                    -- FK adicionada na migration de orçamento
  observacoes text,
  motivo_cancelamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entregue_em timestamptz,
  unique (id, empresa_id),
  unique (empresa_id, numero),
  foreign key (cliente_id, empresa_id) references public.clientes (id, empresa_id),
  foreign key (motor_id, empresa_id) references public.motores (id, empresa_id) on delete set null (motor_id),
  foreign key (recebido_por, empresa_id) references public.membros (id, empresa_id) on delete set null (recebido_por),
  foreign key (tecnico_id, empresa_id) references public.membros (id, empresa_id) on delete set null (tecnico_id),
  foreign key (checklist_template_id, empresa_id) references public.checklist_templates (id, empresa_id) on delete set null (checklist_template_id),
  foreign key (os_origem_id, empresa_id) references public.os (id, empresa_id) on delete set null (os_origem_id)
);

create unique index os_token_publico_idx on public.os (token_publico);
create index os_empresa_status_idx on public.os (empresa_id, status);
create index os_empresa_cliente_created_idx on public.os (empresa_id, cliente_id, created_at desc);
create index os_empresa_motor_idx on public.os (empresa_id, motor_id);
create index os_empresa_tecnico_idx on public.os (empresa_id, tecnico_id) where tecnico_id is not null;
create index os_empresa_placa_final_idx on public.os (empresa_id, cliente_final_placa) where cliente_final_placa is not null;
create index os_empresa_prazo_idx on public.os (empresa_id, prazo_prometido)
  where status not in ('entregue', 'cancelado');

create trigger os_updated_at before update on public.os
  for each row execute function public.tg_set_updated_at();

create table public.os_status_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  os_id uuid not null,
  status_de public.os_status,
  status_para public.os_status not null,
  membro_id uuid,
  motivo text,
  created_at timestamptz not null default now(),
  foreign key (os_id, empresa_id) references public.os (id, empresa_id) on delete cascade,
  foreign key (membro_id, empresa_id) references public.membros (id, empresa_id) on delete set null (membro_id)
);

create index os_status_historico_os_idx on public.os_status_historico (os_id, created_at);

create table public.os_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  os_id uuid not null,
  template_item_id uuid,         -- só referência; o texto é snapshot
  grupo text not null,
  descricao text not null,
  ordem integer not null default 0,
  exige_quantidade boolean not null default false,
  status public.checklist_status not null default 'ok',
  quantidade numeric(10, 2),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id),
  foreign key (os_id, empresa_id) references public.os (id, empresa_id) on delete cascade
);

create index os_checklist_itens_os_idx on public.os_checklist_itens (os_id, ordem);
create trigger os_checklist_itens_updated_at before update on public.os_checklist_itens
  for each row execute function public.tg_set_updated_at();

create table public.os_medicoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  os_id uuid not null,
  componente text not null,
  descricao text not null,
  valor numeric(12, 4),
  valor_texto text,              -- para testes aprovado/reprovado
  unidade text,
  minimo numeric(12, 4),
  maximo numeric(12, 4),
  conforme boolean,              -- calculado por trigger quando há valor e faixa
  membro_id uuid,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id),
  foreign key (os_id, empresa_id) references public.os (id, empresa_id) on delete cascade,
  foreign key (membro_id, empresa_id) references public.membros (id, empresa_id) on delete set null (membro_id)
);

create index os_medicoes_os_idx on public.os_medicoes (os_id);
create trigger os_medicoes_updated_at before update on public.os_medicoes
  for each row execute function public.tg_set_updated_at();

create table public.os_anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  os_id uuid not null,
  checklist_item_id uuid,
  medicao_id uuid,
  etapa public.anexo_etapa not null,
  storage_path text not null unique,  -- {empresa_id}/{os_id}/arquivo
  legenda text,
  criado_por uuid,
  created_at timestamptz not null default now(),
  check (storage_path like empresa_id::text || '/' || os_id::text || '/%'),
  foreign key (os_id, empresa_id) references public.os (id, empresa_id) on delete cascade,
  foreign key (checklist_item_id, empresa_id) references public.os_checklist_itens (id, empresa_id) on delete cascade,
  foreign key (medicao_id, empresa_id) references public.os_medicoes (id, empresa_id) on delete cascade,
  foreign key (criado_por, empresa_id) references public.membros (id, empresa_id) on delete set null (criado_por)
);

create index os_anexos_os_idx on public.os_anexos (os_id, etapa);

create table public.os_assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  os_id uuid not null,
  tipo public.assinatura_tipo not null,
  nome text not null,
  documento text,
  imagem_path text,
  ip text,
  user_agent text,
  registrado_por uuid,
  created_at timestamptz not null default now(),
  foreign key (os_id, empresa_id) references public.os (id, empresa_id) on delete cascade,
  foreign key (registrado_por, empresa_id) references public.membros (id, empresa_id) on delete set null (registrado_por)
);

create index os_assinaturas_os_idx on public.os_assinaturas (os_id, tipo);
