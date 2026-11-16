-- =============================================================================
-- Revisão de segurança (fix/revisao)
--  1. Link público (os.token_publico) só para dono/balcão.
--     Antes, qualquer membro lia o token na tabela `os` (e alterar_status_os o
--     devolvia): o técnico abria /os-publica/<token> e via todos os preços (e
--     podia aprovar o orçamento em nome do cliente). Agora a coluna não é
--     legível por `authenticated`; quem envia o orçamento usa os_link_publico().
--  2. Orçamento: subtotal só pelo recálculo dos itens; enviado/aprovado não
--     muda observações/canal (antes o balcão alterava o subtotal — e o total —
--     de um orçamento já aprovado pelo cliente).
--  3. Resposta ao orçamento (link e balcão) recusada com a OS em recebimento,
--     cancelada ou entregue.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. token_publico fora do alcance de técnico/financeiro
-- -----------------------------------------------------------------------------
revoke select on public.os from authenticated;
grant select (
  id, empresa_id, numero, cliente_id, motor_id, cliente_final_nome, cliente_final_placa,
  cliente_final_telefone, status, prazo_prometido, recebido_por, tecnico_id, checklist_template_id,
  checklist_concluido_em, os_origem_id, eh_garantia, garantia_dias, garantia_ate,
  orcamento_aprovado_id, observacoes, motivo_cancelamento, created_at, updated_at, entregue_em
) on public.os to authenticated;

-- Token do link público da OS: só dono/balcão (quem envia o orçamento).
create or replace function public.os_link_publico(p_os_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_os public.os;
begin
  select * into v_os from public.os where id = p_os_id;
  if not found or not public.tem_papel(v_os.empresa_id, array['dono', 'balcao']::public.papel[]) then
    raise exception 'OS não encontrada' using errcode = 'P0002';
  end if;
  return v_os.token_publico;
end;
$$;

-- criar_os devolve a linha inteira (inclui o token) e `returning *` exigiria
-- SELECT em todas as colunas: passa a ser security definer, com a mesma
-- checagem explícita de papel (dono/balcão). FKs compostas garantem que
-- cliente, motor, template, técnico e OS de origem são da mesma empresa.
create or replace function public.criar_os(
  p_empresa_id uuid,
  p_cliente_id uuid,
  p_motor_id uuid default null,
  p_template_id uuid default null,
  p_prazo_prometido date default null,
  p_cliente_final_nome text default null,
  p_cliente_final_placa text default null,
  p_cliente_final_telefone text default null,
  p_os_origem_id uuid default null,
  p_tecnico_id uuid default null,
  p_observacoes text default null
)
returns public.os
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.os;
  v_template uuid := p_template_id;
  v_motor uuid := p_motor_id;
begin
  if not public.tem_papel(p_empresa_id, array['dono', 'balcao']::public.papel[]) then
    raise exception 'Sem permissão para abrir OS nesta empresa' using errcode = '42501';
  end if;

  if v_template is null then
    select id into v_template from public.checklist_templates
      where empresa_id = p_empresa_id and padrao and ativo
      limit 1;
  end if;

  if p_os_origem_id is not null and v_motor is null then
    select motor_id into v_motor from public.os where id = p_os_origem_id and empresa_id = p_empresa_id;
  end if;

  insert into public.os (
    empresa_id, numero, cliente_id, motor_id, checklist_template_id, prazo_prometido,
    cliente_final_nome, cliente_final_placa, cliente_final_telefone,
    os_origem_id, tecnico_id, observacoes
  ) values (
    p_empresa_id, '', p_cliente_id, v_motor, v_template, p_prazo_prometido,
    nullif(trim(p_cliente_final_nome), ''), p_cliente_final_placa, p_cliente_final_telefone,
    p_os_origem_id, p_tecnico_id, p_observacoes
  )
  returning * into v_os;

  if v_template is not null then
    insert into public.os_checklist_itens (
      empresa_id, os_id, template_item_id, grupo, descricao, ordem, exige_quantidade, quantidade, status
    )
    select p_empresa_id, v_os.id, ti.id, ti.grupo, ti.descricao, ti.ordem, ti.exige_quantidade,
           ti.quantidade_padrao, 'ok'
    from public.checklist_template_itens ti
    where ti.template_id = v_template and ti.empresa_id = p_empresa_id
    order by ti.ordem;
  end if;

  return v_os;
end;
$$;

-- alterar_status_os devolve a OS: sem o token para quem não é dono/balcão.
create or replace function public.alterar_status_os(p_os_id uuid, p_status public.os_status, p_motivo text default null)
returns public.os
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.os;
  v_papel public.papel;
  v_pendencia text;
begin
  select * into v_os from public.os where id = p_os_id for update;
  if not found then
    raise exception 'OS não encontrada' using errcode = 'P0002';
  end if;

  v_papel := public.papel_na_empresa(v_os.empresa_id);
  if v_papel is null then
    raise exception 'OS não encontrada' using errcode = 'P0002';
  end if;

  if v_os.status <> p_status then
    if not public.os_transicao_permitida(v_os.status, p_status) then
      raise exception 'Não é possível passar de % para %', v_os.status, p_status using errcode = 'P0001';
    end if;

    if not (v_papel = any (public.os_papeis_para_status(p_status))) then
      raise exception 'Seu papel não pode mover a OS para %', p_status using errcode = '42501';
    end if;

    if v_papel = 'tecnico' and v_os.tecnico_id is distinct from public.membro_atual(v_os.empresa_id) then
      raise exception 'Técnico só altera OS atribuídas a ele' using errcode = '42501';
    end if;

    if p_status = 'cancelado' and coalesce(trim(p_motivo), '') = '' then
      raise exception 'Informe o motivo do cancelamento' using errcode = 'P0001';
    end if;

    v_pendencia := public.os_pendencias_para_status(p_os_id, p_status);
    if v_pendencia is not null then
      raise exception '%', v_pendencia using errcode = 'P0001';
    end if;

    v_os := public._aplicar_status_os(p_os_id, p_status, p_motivo);
  end if;

  if v_papel not in ('dono', 'balcao') then
    v_os.token_publico := null;
  end if;
  return v_os;
end;
$$;

-- resumo_cliente (security invoker) lia `os.*`: agora só as colunas usadas.
create or replace function public.resumo_cliente(p_cliente_id uuid)
returns table (
  os_em_andamento integer,
  os_12_meses integer,
  em_aberto numeric,
  motores_em_garantia integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with c as (
    select cl.id, cl.empresa_id from public.clientes cl where cl.id = p_cliente_id
  ),
  o as (
    select os.id, os.status, os.created_at, os.motor_id, os.garantia_ate, os.orcamento_aprovado_id
    from public.os os join c on c.id = os.cliente_id and c.empresa_id = os.empresa_id
    where os.status <> 'em_recebimento'
  )
  select
    (select count(*)::integer from o
      where o.status in ('recebido', 'em_analise', 'orcamento_enviado', 'aprovado',
                         'em_execucao', 'aguardando_peca', 'pronto')),
    (select count(*)::integer from o where o.created_at >= now() - interval '1 year'),
    case when public.pode_ver_precos(c.empresa_id) then
      (select coalesce(sum(orc.total), 0) from o
         join public.orcamentos orc on orc.id = o.orcamento_aprovado_id
        where o.status in ('aprovado', 'em_execucao', 'aguardando_peca', 'pronto'))
    end,
    (select count(distinct coalesce(o.motor_id, o.id))::integer from o
      where o.status = 'entregue'
        and o.garantia_ate >= (now() at time zone 'America/Sao_Paulo')::date)
  from c
$$;

-- -----------------------------------------------------------------------------
-- 2. Orçamento: subtotal calculado; enviado/aprovado imutável
-- -----------------------------------------------------------------------------
create or replace function public.tg_orcamentos_antes_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_fluxo boolean := coalesce(current_setting('app.alterando_orcamento', true), '') = 'on';
begin
  if new.os_id <> old.os_id or new.versao <> old.versao or new.empresa_id <> old.empresa_id then
    raise exception 'OS e versão do orçamento não podem ser alterados' using errcode = '42501';
  end if;
  if auth.uid() is not null and not v_fluxo then
    if new.status is distinct from old.status
       or new.enviado_em is distinct from old.enviado_em
       or new.respondido_em is distinct from old.respondido_em
       or new.respondido_por_nome is distinct from old.respondido_por_nome
       or new.respondido_ip is distinct from old.respondido_ip then
      raise exception 'Use enviar_orcamento()/responder_orcamento() para mudar o status'
        using errcode = '42501';
    end if;
    if new.subtotal is distinct from old.subtotal then
      raise exception 'O subtotal é calculado pelos itens do orçamento' using errcode = '42501';
    end if;
    if old.status <> 'rascunho' and (new.desconto <> old.desconto
        or new.validade is distinct from old.validade
        or new.observacoes is distinct from old.observacoes
        or new.canal is distinct from old.canal) then
      raise exception 'Orçamento já enviado: crie uma nova versão para alterar' using errcode = 'P0001';
    end if;
    if new.desconto_aprovado_por is distinct from old.desconto_aprovado_por
       and new.desconto_aprovado_por is not null
       and not public.tem_papel(new.empresa_id, array['dono']::public.papel[]) then
      raise exception 'Só o dono aprova desconto acima do limite' using errcode = '42501';
    end if;
    if new.desconto_aprovado_por is not null and new.desconto_aprovado_por is distinct from old.desconto_aprovado_por then
      new.desconto_aprovado_por := public.membro_atual(new.empresa_id);
    end if;
  end if;
  new.total := greatest(new.subtotal - new.desconto, 0);
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Resposta só com a OS num status que aceita orçamento
-- -----------------------------------------------------------------------------
create or replace function public._responder_orcamento(
  p_orcamento_id uuid, p_aprovar boolean, p_nome text, p_canal public.canal, p_ip text, p_user_agent text
)
returns public.orcamentos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orc public.orcamentos;
  v_os public.os;
  v_novo public.os_status := case when p_aprovar then 'aprovado' else 'reprovado' end;
begin
  select * into v_orc from public.orcamentos where id = p_orcamento_id for update;
  if v_orc.status is distinct from 'enviado' then
    raise exception 'Este orçamento não está aguardando resposta' using errcode = 'P0001';
  end if;
  select * into v_os from public.os where id = v_orc.os_id;
  if v_os.status in ('em_recebimento', 'cancelado', 'entregue') then
    raise exception 'Esta OS não aceita mais resposta ao orçamento: fale com a retífica' using errcode = 'P0001';
  end if;
  if coalesce(length(trim(p_nome)), 0) < 2 then
    raise exception 'Informe o nome de quem respondeu' using errcode = 'P0001';
  end if;

  perform set_config('app.alterando_orcamento', 'on', true);
  update public.orcamentos set
    status = case when p_aprovar then 'aprovado'::public.orcamento_status else 'reprovado'::public.orcamento_status end,
    respondido_em = now(),
    respondido_por_nome = trim(p_nome),
    respondido_ip = p_ip,
    canal = p_canal
  where id = p_orcamento_id
  returning * into v_orc;

  if p_aprovar then
    update public.os set orcamento_aprovado_id = v_orc.id where id = v_orc.os_id;
    insert into public.os_assinaturas (empresa_id, os_id, tipo, nome, ip, user_agent)
    values (v_orc.empresa_id, v_orc.os_id, 'aprovacao', trim(p_nome), p_ip, p_user_agent);
  end if;
  perform set_config('app.alterando_orcamento', '', true);

  select * into v_os from public.os where id = v_orc.os_id;
  if public.os_transicao_permitida(v_os.status, v_novo) then
    perform public._aplicar_status_os(
      v_os.id, v_novo,
      'Orçamento v' || v_orc.versao || case when p_aprovar then ' aprovado' else ' reprovado' end
        || ' por ' || trim(p_nome) || ' (' || p_canal::text || ')'
    );
  end if;
  return v_orc;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants (o Supabase concede EXECUTE a anon por padrão em funções novas)
-- -----------------------------------------------------------------------------
revoke execute on function public.os_link_publico(uuid) from public, anon;
grant execute on function public.os_link_publico(uuid) to authenticated, service_role;
