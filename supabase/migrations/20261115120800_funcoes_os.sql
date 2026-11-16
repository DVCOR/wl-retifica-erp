-- =============================================================================
-- Funções e triggers da OS: numeração, histórico de status, transições,
-- criação com snapshot do checklist, medições
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Numeração atômica por empresa/ano: 2026-000123
-- -----------------------------------------------------------------------------
create or replace function public.proximo_numero_os(p_empresa_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ano integer := extract(year from (now() at time zone 'America/Sao_Paulo'))::integer;
  v_numero integer;
begin
  if auth.uid() is not null
     and not public.tem_papel(p_empresa_id, array['dono', 'balcao']::public.papel[]) then
    raise exception 'Sem permissão para abrir OS nesta empresa' using errcode = '42501';
  end if;

  insert into public.os_sequencias as s (empresa_id, ano, ultimo_numero)
  values (p_empresa_id, v_ano, 1)
  on conflict (empresa_id, ano) do update set ultimo_numero = s.ultimo_numero + 1
  returning s.ultimo_numero into v_numero;

  return v_ano::text || '-' || lpad(v_numero::text, 6, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- Antes de inserir OS: número, token, padrões
-- -----------------------------------------------------------------------------
create or replace function public.tg_os_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config jsonb;
begin
  -- pelo app o número é sempre gerado; só cargas administrativas (sem usuário) podem informar
  if auth.uid() is not null or new.numero is null or new.numero = '' then
    new.numero := public.proximo_numero_os(new.empresa_id);
  end if;
  new.token_publico := gen_random_uuid();
  new.cliente_final_placa := public.so_alfanumerico(new.cliente_final_placa);
  new.cliente_final_telefone := nullif(regexp_replace(coalesce(new.cliente_final_telefone, ''), '\D', '', 'g'), '');
  if auth.uid() is not null then
    -- pelo app, a OS sempre nasce em recebimento; mudanças só por alterar_status_os()
    new.status := 'em_recebimento';
    new.recebido_por := coalesce(new.recebido_por, public.membro_atual(new.empresa_id));
    new.orcamento_aprovado_id := null;
    new.entregue_em := null;
  end if;
  if new.garantia_dias is null then
    select config into v_config from public.empresas where id = new.empresa_id;
    new.garantia_dias := coalesce((v_config ->> 'garantia_dias_padrao')::integer, 90);
  end if;
  return new;
end;
$$;

create trigger os_antes_inserir before insert on public.os
  for each row execute function public.tg_os_antes_inserir();

-- -----------------------------------------------------------------------------
-- Antes de atualizar OS: campos imutáveis e status só via alterar_status_os()
-- -----------------------------------------------------------------------------
create or replace function public.tg_os_antes_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.empresa_id <> old.empresa_id or new.numero <> old.numero then
    raise exception 'Empresa e número da OS não podem ser alterados' using errcode = '42501';
  end if;
  if auth.uid() is not null then
    if new.status is distinct from old.status
       and coalesce(current_setting('app.alterando_status', true), '') <> 'on' then
      raise exception 'Use alterar_status_os() para mudar o status da OS' using errcode = '42501';
    end if;
    if new.token_publico is distinct from old.token_publico
       and coalesce(current_setting('app.alterando_token', true), '') <> 'on' then
      raise exception 'Use regenerar_token_publico() para trocar o link público' using errcode = '42501';
    end if;
    if (new.orcamento_aprovado_id is distinct from old.orcamento_aprovado_id
        or new.entregue_em is distinct from old.entregue_em
        or new.garantia_ate is distinct from old.garantia_ate)
       and coalesce(current_setting('app.alterando_status', true), '') <> 'on'
       and coalesce(current_setting('app.alterando_orcamento', true), '') <> 'on' then
      raise exception 'Campos controlados pelo fluxo da OS não podem ser alterados diretamente'
        using errcode = '42501';
    end if;
  end if;
  new.cliente_final_placa := public.so_alfanumerico(new.cliente_final_placa);
  return new;
end;
$$;

create trigger os_antes_atualizar before update on public.os
  for each row execute function public.tg_os_antes_atualizar();

-- -----------------------------------------------------------------------------
-- Histórico de status (insert e update)
-- -----------------------------------------------------------------------------
create or replace function public.tg_os_historico_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.os_status_historico (empresa_id, os_id, status_de, status_para, membro_id, motivo)
    values (
      new.empresa_id,
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      public.membro_atual(new.empresa_id),
      nullif(current_setting('app.motivo_status', true), '')
    );
  end if;
  return null;
end;
$$;

create trigger os_historico_status after insert or update of status on public.os
  for each row execute function public.tg_os_historico_status();

-- -----------------------------------------------------------------------------
-- Regras de transição
-- -----------------------------------------------------------------------------
create or replace function public.os_transicao_permitida(p_de public.os_status, p_para public.os_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_de
    when 'em_recebimento'    then p_para in ('recebido', 'cancelado')
    when 'recebido'          then p_para in ('em_analise', 'orcamento_enviado', 'cancelado')
    when 'em_analise'        then p_para in ('orcamento_enviado', 'cancelado')
    when 'orcamento_enviado' then p_para in ('aprovado', 'reprovado', 'em_analise', 'orcamento_enviado', 'cancelado')
    when 'aprovado'          then p_para in ('em_execucao', 'orcamento_enviado', 'cancelado')
    when 'reprovado'         then p_para in ('orcamento_enviado', 'entregue', 'cancelado')
    when 'em_execucao'       then p_para in ('aguardando_peca', 'pronto', 'orcamento_enviado', 'cancelado')
    when 'aguardando_peca'   then p_para in ('em_execucao', 'cancelado')
    when 'pronto'            then p_para in ('entregue', 'em_execucao')
    else false
  end
$$;

-- Quais papéis podem mover a OS para cada status (o cliente usa o link público).
create or replace function public.os_papeis_para_status(p_para public.os_status)
returns public.papel[]
language sql
immutable
set search_path = ''
as $$
  select case p_para
    when 'recebido'          then array['dono', 'balcao']
    when 'em_analise'        then array['dono', 'balcao', 'tecnico']
    when 'orcamento_enviado' then array['dono', 'balcao']
    when 'aprovado'          then array['dono', 'balcao']
    when 'reprovado'         then array['dono', 'balcao']
    when 'em_execucao'       then array['dono', 'balcao', 'tecnico']
    when 'aguardando_peca'   then array['dono', 'balcao', 'tecnico']
    when 'pronto'            then array['dono', 'balcao', 'tecnico']
    when 'entregue'          then array['dono', 'balcao', 'financeiro']
    when 'cancelado'         then array['dono']
    else array[]::text[]
  end::public.papel[]
$$;

-- Aplica a mudança (sem checar papel). Uso interno.
create or replace function public._aplicar_status_os(p_os_id uuid, p_status public.os_status, p_motivo text)
returns public.os
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.os;
begin
  perform set_config('app.alterando_status', 'on', true);
  perform set_config('app.motivo_status', coalesce(p_motivo, ''), true);

  update public.os o set
    status = p_status,
    entregue_em = case when p_status = 'entregue' then now() else o.entregue_em end,
    garantia_ate = case
      when p_status = 'entregue' and o.status = 'pronto'
        then (now() at time zone 'America/Sao_Paulo')::date + coalesce(o.garantia_dias, 0)
      else o.garantia_ate end,
    motivo_cancelamento = case when p_status = 'cancelado' then p_motivo else o.motivo_cancelamento end
  where o.id = p_os_id
  returning * into v_os;

  perform set_config('app.alterando_status', '', true);
  perform set_config('app.motivo_status', '', true);
  return v_os;
end;
$$;

-- Verifica pré-condições do status de destino; devolve mensagem de erro ou null.
create or replace function public.os_pendencias_para_status(p_os_id uuid, p_para public.os_status)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_os public.os;
  v_fotos integer;
begin
  select * into v_os from public.os where id = p_os_id;
  if not found or (auth.uid() is not null
                   and v_os.empresa_id not in (select public.empresas_do_usuario())) then
    return 'OS não encontrada';
  end if;
  if p_para = 'recebido' then
    if v_os.checklist_concluido_em is null then
      return 'Conclua o checklist de recebimento';
    end if;
    select count(*) into v_fotos from public.os_anexos
      where os_id = p_os_id and etapa = 'recebimento' and checklist_item_id is null;
    if v_fotos < 3 then
      return 'Tire ao menos 3 fotos gerais do motor';
    end if;
    if not exists (select 1 from public.os_assinaturas where os_id = p_os_id and tipo = 'recebimento') then
      return 'Colete a assinatura do cliente';
    end if;
  elsif p_para = 'orcamento_enviado' then
    if not exists (
      select 1 from public.orcamentos o
      where o.os_id = p_os_id and o.status = 'enviado'
        and exists (select 1 from public.orcamento_itens i where i.orcamento_id = o.id)
    ) then
      return 'Envie um orçamento com ao menos 1 item';
    end if;
  elsif p_para = 'aprovado' then
    if v_os.orcamento_aprovado_id is null then
      return 'Registre a aprovação do orçamento';
    end if;
  elsif p_para = 'entregue' then
    if not exists (select 1 from public.os_assinaturas where os_id = p_os_id and tipo = 'entrega') then
      return 'Colete a assinatura de retirada';
    end if;
  end if;
  return null;
end;
$$;

-- Função pública para mudar status (quadro, bancada, entrega, cancelamento).
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

  if v_os.status = p_status then
    return v_os;
  end if;

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

  return public._aplicar_status_os(p_os_id, p_status, p_motivo);
end;
$$;

-- Troca o token do link público (revoga o link anterior).
create or replace function public.regenerar_token_publico(p_os_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_token uuid := gen_random_uuid();
begin
  select empresa_id into v_empresa from public.os where id = p_os_id;
  if v_empresa is null or not public.tem_papel(v_empresa, array['dono', 'balcao']::public.papel[]) then
    raise exception 'OS não encontrada' using errcode = 'P0002';
  end if;
  perform set_config('app.alterando_token', 'on', true);
  update public.os set token_publico = v_token where id = p_os_id;
  perform set_config('app.alterando_token', '', true);
  return v_token;
end;
$$;

-- -----------------------------------------------------------------------------
-- criar_os: cria a OS (status em_recebimento) e copia (snapshot) os itens do
-- template de checklist. Security invoker: RLS vale (só dono/balcão).
-- -----------------------------------------------------------------------------
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
security invoker
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

-- -----------------------------------------------------------------------------
-- Defaults de autoria e cálculo de conformidade
-- -----------------------------------------------------------------------------
create or replace function public.tg_medicoes_antes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.membro_id := coalesce(new.membro_id, public.membro_atual(new.empresa_id));
  end if;
  if new.valor is not null and (new.minimo is not null or new.maximo is not null) then
    new.conforme := (new.minimo is null or new.valor >= new.minimo)
                and (new.maximo is null or new.valor <= new.maximo);
  end if;
  return new;
end;
$$;

create trigger os_medicoes_antes before insert or update on public.os_medicoes
  for each row execute function public.tg_medicoes_antes();

create or replace function public.tg_anexos_antes_inserir()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.criado_por := coalesce(new.criado_por, public.membro_atual(new.empresa_id));
  return new;
end;
$$;

create trigger os_anexos_antes_inserir before insert on public.os_anexos
  for each row execute function public.tg_anexos_antes_inserir();

create or replace function public.tg_assinaturas_antes_inserir()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.registrado_por := coalesce(new.registrado_por, public.membro_atual(new.empresa_id));
  return new;
end;
$$;

create trigger os_assinaturas_antes_inserir before insert on public.os_assinaturas
  for each row execute function public.tg_assinaturas_antes_inserir();

create or replace function public.tg_apontamentos_antes_inserir()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.membro_id := coalesce(new.membro_id, public.membro_atual(new.empresa_id));
  return new;
end;
$$;

create trigger apontamentos_antes_inserir before insert on public.apontamentos
  for each row execute function public.tg_apontamentos_antes_inserir();
