-- =============================================================================
-- Rodada 3 (dono do banco):
--  1. orcamento_itens.concluido_em/concluido_por + marcar_item_concluido()
--  2. orcamento_rascunho_para_sugestao(): técnico sugere item sem esperar o balcão
--  3. desconto aprovado pelo dono é revogado se o desconto mudar depois
--  4. os_publica_fotos() devolve medicao_id
--  5. realtime de apontamentos e orcamentos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Item de serviço concluído
-- -----------------------------------------------------------------------------
alter table public.orcamento_itens
  add column concluido_em timestamptz,
  add column concluido_por uuid,
  add constraint orcamento_itens_concluido_por_fk foreign key (concluido_por, empresa_id)
    references public.membros (id, empresa_id) on delete set null (concluido_por);

-- Mesma regra de antes + conclusão só por marcar_item_concluido() (que pula o
-- resto: o item pode estar num orçamento aprovado e quem marca pode ser técnico).
create or replace function public.tg_orcamento_itens_antes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orc public.orcamentos;
  v_cliente uuid;
  v_bruto numeric;
begin
  if tg_op = 'UPDATE' and coalesce(current_setting('app.concluindo_item', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.concluido_em := null;
    new.concluido_por := null;
  elsif tg_op = 'UPDATE'
     and (new.concluido_em is distinct from old.concluido_em
          or new.concluido_por is distinct from old.concluido_por) then
    raise exception 'Use marcar_item_concluido() para concluir um serviço' using errcode = '42501';
  end if;

  select * into v_orc from public.orcamentos
    where id = coalesce(new.orcamento_id, old.orcamento_id);
  if v_orc.status <> 'rascunho' and coalesce(current_setting('app.alterando_orcamento', true), '') <> 'on' then
    raise exception 'Orçamento já enviado: crie uma nova versão para alterar' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' and new.orcamento_id <> old.orcamento_id then
    raise exception 'Item não pode mudar de orçamento' using errcode = '42501';
  end if;

  -- técnico (sem dono/balcão) só sugere: preço vem da tabela, sem desconto
  if auth.uid() is not null
     and not public.tem_papel(new.empresa_id, array['dono', 'balcao']::public.papel[]) then
    new.preco_unitario := null;
    new.desconto := 0;
    if tg_op = 'INSERT' then
      new.sugerido_por := public.membro_atual(new.empresa_id);
    end if;
  end if;

  if new.preco_unitario is null then
    select cliente_id into v_cliente from public.os where id = v_orc.os_id;
    new.preco_unitario := public._preco_sugerido(new.empresa_id, v_cliente, new.servico_id, new.peca_id);
  end if;

  v_bruto := round(new.quantidade * new.preco_unitario, 2);
  if new.desconto > v_bruto then
    raise exception 'Desconto do item maior que o valor do item' using errcode = 'P0001';
  end if;
  new.total := v_bruto - new.desconto;
  return new;
end;
$$;

-- Marca/desmarca um item do orçamento aprovado como concluído.
-- Técnico, dono ou balcão da empresa; só com a OS em execução/aguardando peça.
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

  perform set_config('app.concluindo_item', 'on', true);
  update public.orcamento_itens
     set concluido_em = case when p_concluido then coalesce(concluido_em, now()) end,
         concluido_por = case when p_concluido then coalesce(concluido_por, public.membro_atual(empresa_id)) end
   where id = p_item_id;
  perform set_config('app.concluindo_item', '', true);
end;
$$;

-- View sem preço do técnico ganha as colunas de conclusão (no fim: create or replace).
create or replace view public.v_orcamento_itens_sem_preco with (security_barrier = true) as
  select i.id, i.empresa_id, o.os_id, i.orcamento_id, o.versao, o.status as orcamento_status,
         i.tipo, i.servico_id, i.peca_id, i.descricao, i.quantidade, i.ordem,
         i.sugerido_por_medicao_id, i.sugerido_por, i.concluido_em, i.concluido_por
  from public.orcamento_itens i
  join public.orcamentos o on o.id = i.orcamento_id
  where i.empresa_id in (select public.empresas_do_usuario());

-- -----------------------------------------------------------------------------
-- 2. Rascunho para sugestão do técnico
-- Devolve o rascunho vigente da OS ou cria a versão seguinte em rascunho.
-- Recusa se a última versão está enviada/aprovada (o balcão decide a nova versão).
-- -----------------------------------------------------------------------------
create or replace function public.orcamento_rascunho_para_sugestao(p_os_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.os;
  v_ult public.orcamentos;
  v_id uuid;
begin
  select * into v_os from public.os where id = p_os_id for update;
  if not found
     or not public.tem_papel(v_os.empresa_id, array['dono', 'balcao', 'tecnico']::public.papel[]) then
    raise exception 'OS não encontrada ou sem permissão' using errcode = '42501';
  end if;
  if v_os.status in ('em_recebimento', 'pronto', 'entregue', 'cancelado') then
    raise exception 'Não é possível sugerir itens com a OS neste status' using errcode = 'P0001';
  end if;

  select * into v_ult from public.orcamentos where os_id = p_os_id order by versao desc limit 1;
  if found then
    if v_ult.status = 'rascunho' then
      return v_ult.id;
    end if;
    if v_ult.status in ('enviado', 'aprovado') then
      raise exception 'O orçamento já foi enviado: peça ao balcão para criar uma nova versão'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.orcamentos (empresa_id, os_id, versao)
  values (v_os.empresa_id, v_os.id, 0)
  returning id into v_id;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Desconto aprovado revogado quando o desconto muda (exceto pelo dono)
-- -----------------------------------------------------------------------------
create or replace function public.tg_orcamentos_revogar_desconto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.desconto_aprovado_por is not null
     and new.desconto_aprovado_por is not distinct from old.desconto_aprovado_por
     and new.desconto <> old.desconto
     and not public.tem_papel(new.empresa_id, array['dono']::public.papel[]) then
    new.desconto_aprovado_por := null;
  end if;
  return new;
end;
$$;

-- nome ordena depois de orcamentos_antes_atualizar
create trigger orcamentos_revogar_desconto before update of desconto on public.orcamentos
  for each row execute function public.tg_orcamentos_revogar_desconto();

create or replace function public.tg_orcamento_itens_revogar_desconto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mudou boolean;
  v_empresa uuid := coalesce(new.empresa_id, old.empresa_id);
begin
  v_mudou := case tg_op
    when 'INSERT' then new.desconto <> 0
    when 'DELETE' then old.desconto <> 0
    else new.desconto is distinct from old.desconto
  end;
  if v_mudou and not public.tem_papel(v_empresa, array['dono']::public.papel[]) then
    update public.orcamentos
       set desconto_aprovado_por = null
     where id = coalesce(new.orcamento_id, old.orcamento_id)
       and desconto_aprovado_por is not null;
  end if;
  return null;
end;
$$;

create trigger orcamento_itens_revogar_desconto after insert or update or delete on public.orcamento_itens
  for each row execute function public.tg_orcamento_itens_revogar_desconto();

-- -----------------------------------------------------------------------------
-- 4. Fotos da página pública com a medição (mesma entrada; saída mudou → drop)
-- -----------------------------------------------------------------------------
drop function public.os_publica_fotos(uuid);

create function public.os_publica_fotos(p_token uuid)
returns table (storage_path text, etapa public.anexo_etapa, legenda text, medicao_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select a.storage_path, a.etapa, a.legenda, a.medicao_id
  from public.os o
  join public.os_anexos a on a.os_id = o.id
  where o.token_publico = p_token and o.status <> 'em_recebimento'
    and a.etapa in ('recebimento', 'analise')
  order by a.created_at
$$;

-- -----------------------------------------------------------------------------
-- 5. Realtime (só se a publicação do Supabase existir)
-- -----------------------------------------------------------------------------
do $$
declare
  v_tabela text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_tabela in array array['apontamentos', 'orcamentos'] loop
      if not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_tabela) then
        execute format('alter publication supabase_realtime add table public.%I', v_tabela);
      end if;
    end loop;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke execute on function
  public.tg_orcamento_itens_antes(),
  public.tg_orcamentos_revogar_desconto(),
  public.tg_orcamento_itens_revogar_desconto()
from public, anon, authenticated;

revoke execute on function
  public.marcar_item_concluido(uuid, boolean),
  public.orcamento_rascunho_para_sugestao(uuid)
from public, anon;
grant execute on function
  public.marcar_item_concluido(uuid, boolean),
  public.orcamento_rascunho_para_sugestao(uuid)
to authenticated, service_role;

revoke execute on function public.os_publica_fotos(uuid) from public, anon, authenticated;
grant execute on function public.os_publica_fotos(uuid) to service_role;
