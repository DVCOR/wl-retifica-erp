-- =============================================================================
-- Modo local (offline): usuários criados pelo dono, sem convite por e-mail.
-- O servidor cria a conta no GoTrue (API admin, service role) e chama esta
-- função, com a sessão do dono, para vincular o usuário à empresa.
-- =============================================================================

create or replace function public.adicionar_membro(
  p_empresa_id uuid,
  p_user_id uuid,
  p_nome text,
  p_papel public.papel
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := nullif(trim(p_nome), '');
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login para adicionar usuários' using errcode = '42501';
  end if;
  if not public.tem_papel(p_empresa_id, array['dono']::public.papel[]) then
    raise exception 'Só o dono pode adicionar usuários' using errcode = '42501';
  end if;
  if v_nome is null then
    raise exception 'Informe o nome do usuário' using errcode = 'P0001';
  end if;
  if p_papel is null then
    raise exception 'Informe o papel do usuário' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Usuário não encontrado' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.membros where empresa_id = p_empresa_id and user_id = p_user_id) then
    raise exception 'Este usuário já faz parte da empresa' using errcode = 'P0001';
  end if;
  -- só contas novas (ou sem vínculo): o dono não "puxa" usuário de outra empresa
  if exists (select 1 from public.membros where user_id = p_user_id) then
    raise exception 'Este usuário já pertence a outra empresa' using errcode = 'P0001';
  end if;

  insert into public.membros (empresa_id, user_id, nome, papel)
  values (p_empresa_id, p_user_id, v_nome, p_papel)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.adicionar_membro(uuid, uuid, text, public.papel) from public, anon;
grant execute on function public.adicionar_membro(uuid, uuid, text, public.papel) to authenticated;
