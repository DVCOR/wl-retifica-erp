-- =============================================================================
-- Tenant e acesso: empresas, membros, convites + funções de autorização
-- =============================================================================

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 60),
  nome_fantasia text not null check (length(trim(nome_fantasia)) > 0),
  razao_social text,
  cnpj text,
  ie text,
  im text,
  regime_tributario text,
  endereco jsonb not null default '{}'::jsonb,   -- {logradouro, numero, bairro, cidade, uf, cep, codigo_ibge}
  telefone text,
  email text,
  logo_path text,
  config jsonb not null default jsonb_build_object(
    'tecnico_ve_precos', false,
    'validade_orcamento_dias', 7,
    'garantia_dias_padrao', 90,
    'cobrar_taxa_analise', false,
    'taxa_analise_valor', 0,
    'termos_recebimento', '',
    'termos_garantia', ''
  ),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger empresas_updated_at before update on public.empresas
  for each row execute function public.tg_set_updated_at();

create table public.membros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  papel public.papel not null,
  limite_desconto_pct numeric(5, 2) not null default 0 check (limite_desconto_pct between 0 and 100),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, user_id),
  unique (id, empresa_id)
);

create index membros_user_id_idx on public.membros (user_id) where ativo;

create trigger membros_updated_at before update on public.membros
  for each row execute function public.tg_set_updated_at();

create table public.convites (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%@%'),
  nome text,
  papel public.papel not null,
  token uuid not null unique default gen_random_uuid(),
  expira_em timestamptz not null default now() + interval '7 days',
  aceito_em timestamptz,
  aceito_por uuid references auth.users (id) on delete set null,
  convidado_por uuid,
  created_at timestamptz not null default now(),
  foreign key (convidado_por, empresa_id) references public.membros (id, empresa_id) on delete set null (convidado_por)
);

create index convites_empresa_idx on public.convites (empresa_id);
create unique index convites_pendente_unico on public.convites (empresa_id, email) where aceito_em is null;

-- -----------------------------------------------------------------------------
-- Funções de autorização (usadas nas políticas RLS)
-- security definer + stable + search_path fixo: leem `membros` sem passar
-- pela RLS de `membros` (evita recursão) e só devolvem dados do próprio usuário.
-- -----------------------------------------------------------------------------

create or replace function public.empresas_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.empresa_id
  from public.membros m
  join public.empresas e on e.id = m.empresa_id and e.ativo
  where m.user_id = auth.uid() and m.ativo
$$;

create or replace function public.tem_papel(p_empresa_id uuid, p_papeis public.papel[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membros m
    join public.empresas e on e.id = m.empresa_id and e.ativo
    where m.user_id = auth.uid()
      and m.ativo
      and m.empresa_id = p_empresa_id
      and m.papel = any (p_papeis)
  )
$$;

create or replace function public.papel_na_empresa(p_empresa_id uuid)
returns public.papel
language sql
stable
security definer
set search_path = ''
as $$
  select m.papel
  from public.membros m
  join public.empresas e on e.id = m.empresa_id and e.ativo
  where m.user_id = auth.uid() and m.ativo and m.empresa_id = p_empresa_id
$$;

-- id do membro do usuário logado na empresa (null se não for membro).
create or replace function public.membro_atual(p_empresa_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.membros m
  where m.user_id = auth.uid() and m.ativo and m.empresa_id = p_empresa_id
$$;

-- Pode ver colunas de preço? Todos menos o técnico, a não ser que a empresa
-- tenha ligado config.tecnico_ve_precos.
create or replace function public.pode_ver_precos(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membros m
    join public.empresas e on e.id = m.empresa_id and e.ativo
    where m.user_id = auth.uid()
      and m.ativo
      and m.empresa_id = p_empresa_id
      and (m.papel <> 'tecnico' or coalesce((e.config ->> 'tecnico_ve_precos')::boolean, false))
  )
$$;

-- Garante que sempre sobra ao menos um dono ativo na empresa.
create or replace function public.tg_membros_mantem_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := coalesce(old.empresa_id, new.empresa_id);
begin
  if old.papel = 'dono' and old.ativo
     and (tg_op = 'DELETE' or new.papel <> 'dono' or not new.ativo) then
    if not exists (
      select 1 from public.membros
      where empresa_id = v_empresa and papel = 'dono' and ativo and id <> old.id
    ) and exists (select 1 from public.empresas where id = v_empresa) then
      raise exception 'A empresa precisa de ao menos um dono ativo' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger membros_mantem_dono
  before update or delete on public.membros
  for each row execute function public.tg_membros_mantem_dono();
