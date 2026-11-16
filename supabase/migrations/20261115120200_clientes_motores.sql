-- =============================================================================
-- Clientes (lojista / final) e motores
-- =============================================================================

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo public.cliente_tipo not null,
  nome text not null check (length(trim(nome)) > 0),
  nome_fantasia text,
  documento text,                -- CPF/CNPJ só com dígitos (normalizado por trigger)
  ie text,
  im text,
  telefone_whatsapp text,        -- só dígitos, com DDD
  email text,
  endereco jsonb not null default '{}'::jsonb,
  -- dados financeiros (o papel financeiro só pode alterar estes)
  tabela_preco_id uuid,
  limite_credito numeric(12, 2) check (limite_credito is null or limite_credito >= 0),
  condicao_pagamento text,
  dia_fechamento smallint check (dia_fechamento is null or dia_fechamento between 1 and 31),
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create index clientes_empresa_nome_trgm on public.clientes
  using gin (public.normalizar_busca(nome) extensions.gin_trgm_ops);
create index clientes_empresa_fantasia_trgm on public.clientes
  using gin (public.normalizar_busca(nome_fantasia) extensions.gin_trgm_ops);
create index clientes_empresa_nome_idx on public.clientes (empresa_id, nome);
create index clientes_empresa_documento_idx on public.clientes (empresa_id, documento);
create index clientes_empresa_telefone_idx on public.clientes (empresa_id, telefone_whatsapp);
create unique index clientes_documento_unico on public.clientes (empresa_id, documento)
  where documento is not null and ativo;

create or replace function public.tg_clientes_normaliza()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.documento := nullif(regexp_replace(coalesce(new.documento, ''), '\D', '', 'g'), '');
  new.telefone_whatsapp := nullif(regexp_replace(coalesce(new.telefone_whatsapp, ''), '\D', '', 'g'), '');
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  return new;
end;
$$;

create trigger clientes_normaliza before insert or update on public.clientes
  for each row execute function public.tg_clientes_normaliza();
create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.tg_set_updated_at();

-- O papel financeiro só altera os dados financeiros do cliente (SPEC item 3).
create or replace function public.tg_clientes_restringe_financeiro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and not public.tem_papel(old.empresa_id, array['dono', 'balcao']::public.papel[])
     and public.tem_papel(old.empresa_id, array['financeiro']::public.papel[]) then
    if (to_jsonb(new) - array['tabela_preco_id', 'limite_credito', 'condicao_pagamento', 'dia_fechamento', 'updated_at'])
       is distinct from
       (to_jsonb(old) - array['tabela_preco_id', 'limite_credito', 'condicao_pagamento', 'dia_fechamento', 'updated_at']) then
      raise exception 'O financeiro só pode alterar os dados financeiros do cliente'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger clientes_restringe_financeiro before update on public.clientes
  for each row execute function public.tg_clientes_restringe_financeiro();

create table public.motores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cliente_id uuid,
  marca text,
  modelo text,
  codigo_motor text,
  numero_serie text,
  combustivel public.combustivel,
  cilindros smallint check (cilindros is null or cilindros between 1 and 16),
  cilindrada text,               -- ex.: "1.6", "4.10"
  valvulas_por_cilindro smallint check (valvulas_por_cilindro is null or valvulas_por_cilindro between 1 and 6),
  veiculo_placa text,            -- normalizada: só letras/números maiúsculos
  veiculo_modelo text,
  veiculo_ano smallint check (veiculo_ano is null or veiculo_ano between 1900 and 2100),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id),
  foreign key (cliente_id, empresa_id) references public.clientes (id, empresa_id) on delete set null (cliente_id)
);

create index motores_empresa_codigo_serie_idx on public.motores (empresa_id, codigo_motor, numero_serie);
create index motores_empresa_placa_idx on public.motores (empresa_id, veiculo_placa);
create index motores_empresa_cliente_idx on public.motores (empresa_id, cliente_id);
create index motores_busca_trgm on public.motores using gin (
  public.normalizar_busca(
    coalesce(marca, '') || ' ' || coalesce(modelo, '') || ' ' || coalesce(codigo_motor, '') || ' ' || coalesce(numero_serie, '')
  ) extensions.gin_trgm_ops
);

create or replace function public.tg_motores_normaliza()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.veiculo_placa := public.so_alfanumerico(new.veiculo_placa);
  new.codigo_motor := nullif(upper(trim(coalesce(new.codigo_motor, ''))), '');
  new.numero_serie := nullif(upper(trim(coalesce(new.numero_serie, ''))), '');
  return new;
end;
$$;

create trigger motores_normaliza before insert or update on public.motores
  for each row execute function public.tg_motores_normaliza();
create trigger motores_updated_at before update on public.motores
  for each row execute function public.tg_set_updated_at();
