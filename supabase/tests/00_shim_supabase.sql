-- =============================================================================
-- Shim do Supabase para testes locais (Postgres puro, sem Docker).
-- Simula: papéis anon/authenticated/service_role, schema auth com auth.users,
-- auth.identities, auth.uid()/auth.jwt()/auth.role() lendo request.jwt.claims,
-- e os grants padrão que o Supabase aplica no schema public.
-- NÃO roda no Supabase real.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

create schema if not exists auth;
create schema if not exists extensions;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key default gen_random_uuid(),
  aud text default 'authenticated',
  role text default 'authenticated',
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  confirmation_token text default '',
  recovery_token text default '',
  email_change_token_new text default '',
  email_change text default '',
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (provider_id, provider)
);

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'role', '')
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Grants padrão do Supabase no schema public (a RLS é a barreira real).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema extensions grant all on functions to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Helpers de teste (schema tests): trocar de usuário e afirmar.
-- -----------------------------------------------------------------------------
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Cria usuário em auth.users e devolve o id.
create or replace function tests.criar_usuario(p_email text)
returns uuid
language sql
as $$
  insert into auth.users (email, email_confirmed_at) values (lower(p_email), now())
  on conflict (email) do update set email = excluded.email
  returning id
$$;

-- Passa a agir como o usuário (role authenticated + claims).
create or replace function tests.logar(p_email text)
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  reset role;
  select id into v_id from auth.users where email = lower(p_email);
  if v_id is null then
    raise exception 'usuário de teste % não existe', p_email;
  end if;
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', v_id, 'role', 'authenticated', 'email', lower(p_email))::text, false);
  execute 'set role authenticated';
end;
$$;

create or replace function tests.anonimo()
returns void
language plpgsql
as $$
begin
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, false);
  execute 'set role anon';
end;
$$;

create or replace function tests.deslogar()
returns void
language plpgsql
as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', false);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;
