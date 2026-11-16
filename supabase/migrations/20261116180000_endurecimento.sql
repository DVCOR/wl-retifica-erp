-- =============================================================================
-- Endurecimento final (revisão de segurança)
--  1. caminhos de storage sem traversal (os_anexos, os_assinaturas)
--  2. default privileges sem acesso do anônimo
--  3. membros: user_id e empresa_id imutáveis
--  4. criar_empresa: slugs reservados e formato
--  5. os_assinaturas: aprovação só pelas funções de resposta de orçamento
--  6. bucket empresa-logos sem SVG
--  7. técnico só conclui item / aponta em OS dele (ou sem técnico → assume)
-- =============================================================================

-- ---------------------------------------------------------------- 1. caminhos
create or replace function public.caminho_storage_seguro(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is not null
    and position('..' in p) = 0
    and position('//' in p) = 0
    and position(E'\\' in p) = 0
    and p !~ '[[:cntrl:]]'
$$;

alter table public.os_anexos
  add constraint os_anexos_storage_path_seguro check (public.caminho_storage_seguro(storage_path));

alter table public.os_assinaturas
  add constraint os_assinaturas_imagem_path_seguro check (
    imagem_path is null
    or (public.caminho_storage_seguro(imagem_path)
        and imagem_path like empresa_id::text || '/' || os_id::text || '/%')
  );

-- ---------------------------------------------------------------- 2. default privileges
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
-- O EXECUTE para PUBLIC vem do default global do Postgres: só a forma sem `in schema` o remove.
alter default privileges revoke execute on functions from public;

-- ---------------------------------------------------------------- 3. membros imutáveis
create or replace function public.tg_membros_identidade_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id or new.empresa_id is distinct from old.empresa_id then
    raise exception 'Não é possível trocar o usuário ou a empresa de um membro' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger membros_identidade_imutavel before update on public.membros
  for each row execute function public.tg_membros_identidade_imutavel();

-- ---------------------------------------------------------------- 4. criar_empresa
create or replace function public.criar_empresa(p_nome_fantasia text, p_slug text, p_nome_usuario text)
returns public.empresas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa public.empresas;
  v_slug text := lower(trim(p_slug));
begin
  if auth.uid() is null then
    raise exception 'Faça login para criar uma empresa' using errcode = '42501';
  end if;
  if v_slug !~ '^[a-z0-9](-?[a-z0-9])*$' or length(v_slug) not between 3 and 40 then
    raise exception 'Endereço inválido: use de 3 a 40 letras minúsculas, números e hífens' using errcode = '22023';
  end if;
  if v_slug = any (array['login', 'api', 'auth', 'convite', 'os-publica', 'sem-empresa', '_next', 'admin',
                         'app', 'www', 'static', 'public', 'brand', 'icons', 'manifest.webmanifest']) then
    raise exception 'Endereço reservado, escolha outro' using errcode = '22023';
  end if;

  insert into public.empresas (nome_fantasia, slug)
  values (trim(p_nome_fantasia), v_slug)
  returning * into v_empresa;

  insert into public.membros (empresa_id, user_id, nome, papel, limite_desconto_pct)
  values (v_empresa.id, auth.uid(), coalesce(nullif(trim(p_nome_usuario), ''), 'Dono'), 'dono', 100);

  perform public.inicializar_empresa(v_empresa.id);
  return v_empresa;
end;
$$;

-- ---------------------------------------------------------------- 5. assinaturas
drop policy os_assinaturas_insert on public.os_assinaturas;
create policy os_assinaturas_insert on public.os_assinaturas for insert to authenticated
  with check (
    (tipo = 'recebimento' and public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]))
    or (tipo = 'entrega' and public.tem_papel(empresa_id, array['dono', 'balcao', 'financeiro']::public.papel[]))
  );

-- ---------------------------------------------------------------- 6. bucket de logos
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    update storage.buckets
       set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
     where id = 'empresa-logos';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 7. técnico só no que é dele
-- Garante que o técnico logado pode atuar na OS: ela é dele, ou não tem técnico
-- (então ele assume). Dono/balcão não passam por aqui. Roda como definer para
-- poder atribuir o técnico (técnico não atualiza `os`).
create or replace function public._exigir_tecnico_da_os(p_os_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.os;
  v_membro uuid;
begin
  select * into v_os from public.os where id = p_os_id for update;
  if not found then
    raise exception 'OS não encontrada' using errcode = '42501';
  end if;
  v_membro := public.membro_atual(v_os.empresa_id);
  if v_os.tecnico_id is null then
    update public.os set tecnico_id = v_membro where id = v_os.id;
  elsif v_os.tecnico_id is distinct from v_membro then
    raise exception 'Esta OS está atribuída a outro técnico' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public._exigir_tecnico_da_os(uuid) from public, anon, authenticated;

create or replace function public.tg_apontamentos_tecnico_da_os()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.tem_papel(new.empresa_id, array['tecnico']::public.papel[])
     and (tg_op = 'INSERT' or new.os_id is distinct from old.os_id) then
    perform public._exigir_tecnico_da_os(new.os_id);
  end if;
  return new;
end;
$$;
revoke execute on function public.tg_apontamentos_tecnico_da_os() from public, anon, authenticated;

create trigger apontamentos_tecnico_da_os before insert or update on public.apontamentos
  for each row execute function public.tg_apontamentos_tecnico_da_os();

create or replace function public.marcar_item_concluido(p_item_id uuid, p_concluido boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.orcamento_itens;
  v_os public.os;
begin
  select * into v_item from public.orcamento_itens where id = p_item_id;
  if not found
     or not public.tem_papel(v_item.empresa_id, array['dono', 'balcao', 'tecnico']::public.papel[]) then
    raise exception 'Item não encontrado ou sem permissão' using errcode = '42501';
  end if;
  select o.* into v_os from public.os o
    join public.orcamentos orc on orc.os_id = o.id
   where orc.id = v_item.orcamento_id;
  if v_os.status not in ('em_execucao', 'aguardando_peca') then
    raise exception 'Só é possível concluir serviços com a OS em execução ou aguardando peça'
      using errcode = 'P0001';
  end if;
  if v_os.orcamento_aprovado_id is distinct from v_item.orcamento_id then
    raise exception 'O item não é do orçamento aprovado da OS' using errcode = 'P0001';
  end if;
  if public.tem_papel(v_item.empresa_id, array['tecnico']::public.papel[])
     and not public.tem_papel(v_item.empresa_id, array['dono', 'balcao']::public.papel[]) then
    perform public._exigir_tecnico_da_os(v_os.id);
  end if;

  perform set_config('app.concluindo_item', 'on', true);
  update public.orcamento_itens
     set concluido_em = case when p_concluido then coalesce(concluido_em, now()) end,
         concluido_por = case when p_concluido then coalesce(concluido_por, public.membro_atual(empresa_id)) end
   where id = p_item_id;
  perform set_config('app.concluindo_item', '', true);
end;
$$;
