-- =============================================================================
-- Funções e triggers do orçamento: versões, totais, preço sugerido, envio,
-- resposta (balcão e link público)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Preço sugerido pela tabela do cliente (preço unitário; a quantidade por
-- cilindro/válvula vem de quantidade_sugerida()).
-- -----------------------------------------------------------------------------
create or replace function public._preco_sugerido(p_empresa_id uuid, p_cliente_id uuid, p_servico_id uuid, p_peca_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tabela uuid;
  v_desconto numeric := 0;
  v_preco numeric;
  v_base numeric;
begin
  select coalesce(c.tabela_preco_id, (
           select t.id from public.tabelas_preco t
           where t.empresa_id = p_empresa_id and t.padrao_para = c.tipo and t.ativo limit 1))
    into v_tabela
  from public.clientes c
  where c.id = p_cliente_id and c.empresa_id = p_empresa_id;

  if v_tabela is not null then
    select desconto_padrao_pct into v_desconto from public.tabelas_preco where id = v_tabela;
    select preco into v_preco from public.tabela_preco_itens
      where tabela_preco_id = v_tabela
        and ((p_servico_id is not null and servico_id = p_servico_id)
          or (p_peca_id is not null and peca_id = p_peca_id))
      limit 1;
    if v_preco is not null then
      return v_preco;
    end if;
  end if;

  if p_servico_id is not null then
    select preco_base into v_base from public.servicos where id = p_servico_id and empresa_id = p_empresa_id;
  elsif p_peca_id is not null then
    select preco_venda into v_base from public.pecas where id = p_peca_id and empresa_id = p_empresa_id;
  end if;

  return round(coalesce(v_base, 0) * (1 - coalesce(v_desconto, 0) / 100), 2);
end;
$$;

-- Versão exposta: só para quem pode ver preços.
create or replace function public.preco_sugerido(p_empresa_id uuid, p_cliente_id uuid, p_servico_id uuid, p_peca_id uuid default null)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.pode_ver_precos(p_empresa_id) then
    return null;
  end if;
  return public._preco_sugerido(p_empresa_id, p_cliente_id, p_servico_id, p_peca_id);
end;
$$;

-- Quantidade conforme a unidade do serviço e o motor (cilindros/válvulas).
create or replace function public.quantidade_sugerida(p_servico_id uuid, p_motor_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((
    select case s.unidade
      when 'cilindro' then nullif(m.cilindros, 0)::numeric
      when 'valvula' then nullif(m.cilindros * coalesce(m.valvulas_por_cilindro, 2), 0)::numeric
      else 1
    end
    from public.servicos s
    left join public.motores m on m.id = p_motor_id
    where s.id = p_servico_id
  ), 1)
$$;

-- -----------------------------------------------------------------------------
-- Orçamentos: versão automática; nova versão substitui as anteriores
-- -----------------------------------------------------------------------------
create or replace function public.tg_orcamentos_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dias integer;
begin
  -- serializa a criação de versões da mesma OS
  perform 1 from public.os where id = new.os_id for update;
  select coalesce(max(versao), 0) + 1 into new.versao from public.orcamentos where os_id = new.os_id;
  if auth.uid() is not null then
    new.status := 'rascunho';
    new.enviado_em := null;
    new.respondido_em := null;
    new.respondido_por_nome := null;
    new.respondido_ip := null;
    new.desconto_aprovado_por := null;
  end if;
  new.criado_por := coalesce(new.criado_por, public.membro_atual(new.empresa_id));
  if new.validade is null then
    select coalesce((config ->> 'validade_orcamento_dias')::integer, 7) into v_dias
      from public.empresas where id = new.empresa_id;
    new.validade := (now() at time zone 'America/Sao_Paulo')::date + v_dias;
  end if;
  new.subtotal := 0;
  new.total := 0;
  return new;
end;
$$;

create trigger orcamentos_antes_inserir before insert on public.orcamentos
  for each row execute function public.tg_orcamentos_antes_inserir();

create or replace function public.tg_orcamentos_depois_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.alterando_orcamento', 'on', true);
  update public.orcamentos
     set status = 'substituido'
   where os_id = new.os_id and id <> new.id and status in ('rascunho', 'enviado', 'aprovado');
  update public.os
     set orcamento_aprovado_id = null
   where id = new.os_id and orcamento_aprovado_id is not null;
  perform set_config('app.alterando_orcamento', '', true);
  return null;
end;
$$;

create trigger orcamentos_depois_inserir after insert on public.orcamentos
  for each row execute function public.tg_orcamentos_depois_inserir();

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
    if old.status <> 'rascunho' and (new.desconto <> old.desconto or new.validade is distinct from old.validade) then
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

create trigger orcamentos_antes_atualizar before update on public.orcamentos
  for each row execute function public.tg_orcamentos_antes_atualizar();

-- -----------------------------------------------------------------------------
-- Itens: só em rascunho; preço sugerido; total; técnico só sugere
-- -----------------------------------------------------------------------------
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

create trigger orcamento_itens_antes before insert or update or delete on public.orcamento_itens
  for each row execute function public.tg_orcamento_itens_antes();

create or replace function public.recalcular_orcamento(p_orcamento_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.alterando_orcamento', 'on', true);
  update public.orcamentos o
     set subtotal = coalesce((select sum(i.total) from public.orcamento_itens i where i.orcamento_id = o.id), 0)
   where o.id = p_orcamento_id;
  perform set_config('app.alterando_orcamento', '', true);
end;
$$;

create or replace function public.tg_orcamento_itens_depois()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recalcular_orcamento(coalesce(new.orcamento_id, old.orcamento_id));
  return null;
end;
$$;

create trigger orcamento_itens_depois after insert or update or delete on public.orcamento_itens
  for each row execute function public.tg_orcamento_itens_depois();

-- Insere os itens de um kit (quantidade do kit × quantidade sugerida pelo motor).
create or replace function public.adicionar_kit_orcamento(p_orcamento_id uuid, p_kit_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_orc public.orcamentos;
  v_motor uuid;
  v_qtd integer;
begin
  select * into v_orc from public.orcamentos where id = p_orcamento_id;
  if not found then
    raise exception 'Orçamento não encontrado' using errcode = 'P0002';
  end if;
  select motor_id into v_motor from public.os where id = v_orc.os_id;

  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, peca_id, descricao, quantidade, ordem)
  select v_orc.empresa_id, v_orc.id,
         case when ki.servico_id is not null then 'servico'::public.item_tipo else 'peca'::public.item_tipo end,
         ki.servico_id, ki.peca_id,
         coalesce(s.nome, p.descricao),
         ki.quantidade * case when ki.servico_id is not null then public.quantidade_sugerida(ki.servico_id, v_motor) else 1 end,
         1000 + ki.ordem
  from public.kit_itens ki
  left join public.servicos s on s.id = ki.servico_id
  left join public.pecas p on p.id = ki.peca_id
  where ki.kit_id = p_kit_id and ki.empresa_id = v_orc.empresa_id
  order by ki.ordem;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

-- -----------------------------------------------------------------------------
-- Envio
-- -----------------------------------------------------------------------------
create or replace function public.enviar_orcamento(p_orcamento_id uuid)
returns public.orcamentos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orc public.orcamentos;
  v_os public.os;
  v_papel public.papel;
  v_bruto numeric;
  v_desc_total numeric;
  v_limite numeric;
begin
  select * into v_orc from public.orcamentos where id = p_orcamento_id for update;
  if not found or not public.tem_papel(v_orc.empresa_id, array['dono', 'balcao']::public.papel[]) then
    raise exception 'Orçamento não encontrado' using errcode = 'P0002';
  end if;
  if v_orc.status <> 'rascunho' then
    raise exception 'Só um orçamento em rascunho pode ser enviado' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.orcamento_itens where orcamento_id = p_orcamento_id) then
    raise exception 'O orçamento precisa de ao menos 1 item' using errcode = 'P0001';
  end if;

  v_papel := public.papel_na_empresa(v_orc.empresa_id);
  select coalesce(sum(round(quantidade * preco_unitario, 2)), 0), coalesce(sum(desconto), 0)
    into v_bruto, v_desc_total
    from public.orcamento_itens where orcamento_id = p_orcamento_id;
  v_desc_total := v_desc_total + v_orc.desconto;
  select limite_desconto_pct into v_limite from public.membros
    where id = public.membro_atual(v_orc.empresa_id);
  if v_papel <> 'dono' and v_bruto > 0 and v_orc.desconto_aprovado_por is null
     and (v_desc_total / v_bruto * 100) > coalesce(v_limite, 0) then
    raise exception 'Desconto acima do seu limite (% %%): peça aprovação do dono', coalesce(v_limite, 0)
      using errcode = 'P0001';
  end if;

  perform set_config('app.alterando_orcamento', 'on', true);
  update public.orcamentos set status = 'enviado', enviado_em = now()
    where id = p_orcamento_id returning * into v_orc;
  perform set_config('app.alterando_orcamento', '', true);

  select * into v_os from public.os where id = v_orc.os_id;
  if v_os.status <> 'orcamento_enviado' and public.os_transicao_permitida(v_os.status, 'orcamento_enviado') then
    perform public._aplicar_status_os(v_os.id, 'orcamento_enviado', 'Orçamento v' || v_orc.versao || ' enviado');
  end if;
  return v_orc;
end;
$$;

-- -----------------------------------------------------------------------------
-- Resposta (aprovação/reprovação)
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
  if v_orc.status <> 'enviado' then
    raise exception 'Este orçamento não está aguardando resposta' using errcode = 'P0001';
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

-- Balcão registra aprovação verbal/WhatsApp/telefone.
create or replace function public.responder_orcamento(
  p_orcamento_id uuid, p_aprovar boolean, p_nome text, p_canal public.canal default 'presencial'
)
returns public.orcamentos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  select empresa_id into v_empresa from public.orcamentos where id = p_orcamento_id;
  if v_empresa is null or not public.tem_papel(v_empresa, array['dono', 'balcao']::public.papel[]) then
    raise exception 'Orçamento não encontrado' using errcode = 'P0002';
  end if;
  return public._responder_orcamento(p_orcamento_id, p_aprovar, p_nome, p_canal, null, null);
end;
$$;

-- -----------------------------------------------------------------------------
-- Página pública da OS (sem login): só os campos necessários
-- -----------------------------------------------------------------------------
create or replace function public.os_publica(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_os public.os;
  v_orc public.orcamentos;
  v_res jsonb;
begin
  if p_token is null then
    return null;
  end if;
  select * into v_os from public.os where token_publico = p_token and status <> 'em_recebimento';
  if not found then
    return null;
  end if;

  select * into v_orc from public.orcamentos
    where os_id = v_os.id and status in ('enviado', 'aprovado', 'reprovado')
    order by versao desc limit 1;

  select jsonb_build_object(
    'empresa', jsonb_build_object(
      'nome_fantasia', e.nome_fantasia,
      'telefone', e.telefone,
      'email', e.email,
      'endereco', e.endereco,
      'logo_path', e.logo_path,
      'termos_garantia', e.config ->> 'termos_garantia'
    ),
    'os', jsonb_build_object(
      'numero', v_os.numero,
      'status', v_os.status,
      'created_at', v_os.created_at,
      'prazo_prometido', v_os.prazo_prometido,
      'entregue_em', v_os.entregue_em,
      'garantia_ate', v_os.garantia_ate,
      'cliente_nome', c.nome,
      'cliente_final_placa', v_os.cliente_final_placa,
      'motor', case when m.id is null then null else jsonb_build_object(
        'marca', m.marca, 'modelo', m.modelo, 'codigo_motor', m.codigo_motor,
        'cilindros', m.cilindros, 'cilindrada', m.cilindrada, 'combustivel', m.combustivel,
        'veiculo_placa', m.veiculo_placa) end
    ),
    'orcamento', case when v_orc.id is null then null else jsonb_build_object(
      'versao', v_orc.versao,
      'status', v_orc.status,
      'subtotal', v_orc.subtotal,
      'desconto', v_orc.desconto,
      'total', v_orc.total,
      'validade', v_orc.validade,
      'vencido', v_orc.validade < (now() at time zone 'America/Sao_Paulo')::date,
      'enviado_em', v_orc.enviado_em,
      'respondido_em', v_orc.respondido_em,
      'respondido_por_nome', v_orc.respondido_por_nome,
      'observacoes', v_orc.observacoes,
      'itens', coalesce((
        select jsonb_agg(jsonb_build_object(
          'tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
          'preco_unitario', i.preco_unitario, 'desconto', i.desconto, 'total', i.total
        ) order by i.ordem, i.created_at)
        from public.orcamento_itens i where i.orcamento_id = v_orc.id), '[]'::jsonb)
    ) end,
    'medicoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'componente', md.componente, 'descricao', md.descricao, 'valor', md.valor,
        'valor_texto', md.valor_texto, 'unidade', md.unidade, 'minimo', md.minimo,
        'maximo', md.maximo, 'conforme', md.conforme
      ) order by md.componente, md.created_at)
      from public.os_medicoes md where md.os_id = v_os.id), '[]'::jsonb),
    'qtd_fotos', (select count(*) from public.os_anexos a
                  where a.os_id = v_os.id and a.etapa in ('recebimento', 'analise')),
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('status', h.status_para, 'em', h.created_at) order by h.created_at)
      from public.os_status_historico h where h.os_id = v_os.id), '[]'::jsonb)
  ) into v_res
  from public.empresas e
  join public.clientes c on c.id = v_os.cliente_id
  left join public.motores m on m.id = v_os.motor_id
  where e.id = v_os.empresa_id;

  return v_res;
end;
$$;

create or replace function public.responder_orcamento_publico(
  p_token uuid, p_aprovar boolean, p_nome text, p_ip text default null, p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_os public.os;
  v_orc public.orcamentos;
begin
  select * into v_os from public.os where token_publico = p_token;
  if not found then
    raise exception 'Link inválido ou expirado' using errcode = 'P0002';
  end if;
  select * into v_orc from public.orcamentos
    where os_id = v_os.id and status = 'enviado'
    order by versao desc limit 1;
  if not found then
    raise exception 'Não há orçamento aguardando resposta' using errcode = 'P0001';
  end if;
  if v_orc.validade < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Orçamento vencido: fale com a retífica' using errcode = 'P0001';
  end if;
  perform public._responder_orcamento(v_orc.id, p_aprovar, p_nome, 'link', p_ip, p_user_agent);
  return public.os_publica(p_token);
end;
$$;

-- Caminhos das fotos da página pública. Só service_role (o servidor do Next
-- gera URLs assinadas); não expõe caminhos/ids internos ao navegador.
create or replace function public.os_publica_fotos(p_token uuid)
returns table (storage_path text, etapa public.anexo_etapa, legenda text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.storage_path, a.etapa, a.legenda
  from public.os o
  join public.os_anexos a on a.os_id = o.id
  where o.token_publico = p_token and o.status <> 'em_recebimento'
    and a.etapa in ('recebimento', 'analise')
  order by a.created_at
$$;
