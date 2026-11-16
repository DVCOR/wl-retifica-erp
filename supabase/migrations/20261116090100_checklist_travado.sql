-- =============================================================================
-- Checklist travado após o recebimento.
-- Depois que a OS sai de `em_recebimento`, os itens de os_checklist_itens não
-- podem mais ser inseridos, alterados ou apagados. Exceção: o dono, pela função
-- corrigir_checklist_os(), com motivo obrigatório registrado em `auditoria`.
-- =============================================================================

alter table public.auditoria add column if not exists motivo text;

create or replace function public.tg_os_checklist_travado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.os_checklist_itens := coalesce(new, old);
  v_status public.os_status;
  v_motivo text := nullif(trim(coalesce(current_setting('app.motivo_checklist', true), '')), '');
begin
  select status into v_status from public.os where id = v_row.os_id;
  -- OS sendo apagada (cascade) ou ainda em recebimento: livre.
  if v_status is null or v_status = 'em_recebimento' then
    return coalesce(new, old);
  end if;

  if v_motivo is null
     or (auth.uid() is not null and not public.tem_papel(v_row.empresa_id, array['dono']::public.papel[])) then
    raise exception 'O checklist da OS fica travado depois do recebimento. Só o dono corrige, informando o motivo.'
      using errcode = '42501';
  end if;

  insert into public.auditoria (empresa_id, membro_id, user_id, tabela, registro_id, acao, dados_antes, dados_depois, motivo)
  values (
    v_row.empresa_id,
    public.membro_atual(v_row.empresa_id),
    auth.uid(),
    'os_checklist_itens',
    v_row.id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    v_motivo
  );
  return coalesce(new, old);
end;
$$;

create trigger os_checklist_itens_travado
  before insert or update or delete on public.os_checklist_itens
  for each row execute function public.tg_os_checklist_travado();

-- -----------------------------------------------------------------------------
-- corrigir_checklist_os: correção de um item depois do recebimento (só dono).
-- Parâmetros null mantêm o valor atual; para limpar a observação passe ''.
-- -----------------------------------------------------------------------------
create or replace function public.corrigir_checklist_os(
  p_item_id uuid,
  p_motivo text,
  p_status public.checklist_status default null,
  p_quantidade numeric default null,
  p_observacao text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  select empresa_id into v_empresa from public.os_checklist_itens where id = p_item_id;
  if v_empresa is null then
    raise exception 'Item do checklist não encontrado' using errcode = 'P0002';
  end if;
  if not public.tem_papel(v_empresa, array['dono']::public.papel[]) then
    raise exception 'Só o dono corrige o checklist depois do recebimento.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Informe o motivo da correção' using errcode = 'P0001';
  end if;

  perform set_config('app.motivo_checklist', trim(p_motivo), true);
  update public.os_checklist_itens
     set status = coalesce(p_status, status),
         quantidade = coalesce(p_quantidade, quantidade),
         observacao = case when p_observacao is null then observacao else nullif(trim(p_observacao), '') end
   where id = p_item_id;
  perform set_config('app.motivo_checklist', '', true);
end;
$$;

revoke execute on function public.tg_os_checklist_travado() from public, anon, authenticated;
revoke execute on function public.corrigir_checklist_os(uuid, text, public.checklist_status, numeric, text)
  from public, anon;
grant execute on function public.corrigir_checklist_os(uuid, text, public.checklist_status, numeric, text)
  to authenticated, service_role;
