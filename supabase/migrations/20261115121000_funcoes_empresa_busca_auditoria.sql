-- =============================================================================
-- Empresa (criação/inicialização), convites, busca global e auditoria
-- =============================================================================

-- -----------------------------------------------------------------------------
-- inicializar_empresa: copia o modelo padrão (checklist motor completo,
-- serviços de exemplo, tabelas de preço e um kit) para a empresa.
-- Idempotente: não duplica se a empresa já tiver template padrão.
-- -----------------------------------------------------------------------------
create or replace function public.inicializar_empresa(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template uuid;
  v_kit uuid;
begin
  if auth.uid() is not null and not public.tem_papel(p_empresa_id, array['dono']::public.papel[]) then
    raise exception 'Só o dono inicializa a empresa' using errcode = '42501';
  end if;

  if exists (select 1 from public.checklist_templates where empresa_id = p_empresa_id) then
    return;
  end if;

  insert into public.checklist_templates (empresa_id, nome, tipo_conjunto, padrao)
  values (p_empresa_id, 'Motor completo (padrão)', 'motor_completo', true)
  returning id into v_template;

  insert into public.checklist_template_itens (empresa_id, template_id, grupo, descricao, ordem, exige_quantidade, quantidade_padrao)
  select p_empresa_id, v_template, grupo, descricao, ordem, exige_quantidade, quantidade_padrao
  from public.modelo_checklist_itens
  order by ordem;

  insert into public.servicos (empresa_id, codigo, nome, categoria, unidade, preco_base, tempo_padrao_min)
  select p_empresa_id, codigo, nome, categoria, unidade, preco_base, tempo_padrao_min
  from public.modelo_servicos
  order by id
  on conflict do nothing;

  insert into public.tabelas_preco (empresa_id, nome, desconto_padrao_pct, padrao_para)
  values (p_empresa_id, 'Balcão (cliente final)', 0, 'final'),
         (p_empresa_id, 'Lojista', 15, 'lojista');

  insert into public.kits (empresa_id, nome, descricao)
  values (p_empresa_id, 'Retífica completa de cabeçote 8v', 'Serviços usuais de um cabeçote 8 válvulas')
  returning id into v_kit;

  insert into public.kit_itens (empresa_id, kit_id, servico_id, quantidade, ordem)
  select p_empresa_id, v_kit, s.id, 1, k.ordem
  from (values ('CAB-LAV', 1), ('CAB-TRI', 2), ('CAB-FACE', 3), ('CAB-SEDE', 4),
               ('CAB-VALV', 5), ('CAB-MONT', 6)) as k(codigo, ordem)
  join public.servicos s on s.empresa_id = p_empresa_id and s.codigo = k.codigo;
end;
$$;

-- -----------------------------------------------------------------------------
-- criar_empresa: onboarding. O usuário logado vira dono.
-- -----------------------------------------------------------------------------
create or replace function public.criar_empresa(p_nome_fantasia text, p_slug text, p_nome_usuario text)
returns public.empresas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa public.empresas;
begin
  if auth.uid() is null then
    raise exception 'Faça login para criar uma empresa' using errcode = '42501';
  end if;
  insert into public.empresas (nome_fantasia, slug)
  values (trim(p_nome_fantasia), lower(trim(p_slug)))
  returning * into v_empresa;

  insert into public.membros (empresa_id, user_id, nome, papel, limite_desconto_pct)
  values (v_empresa.id, auth.uid(), coalesce(nullif(trim(p_nome_usuario), ''), 'Dono'), 'dono', 100);

  perform public.inicializar_empresa(v_empresa.id);
  return v_empresa;
end;
$$;

-- -----------------------------------------------------------------------------
-- Convites
-- -----------------------------------------------------------------------------
-- Dados mínimos para a tela /convite/[token] (acessível sem login).
create or replace function public.convite_info(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'empresa_nome', e.nome_fantasia,
    'empresa_slug', e.slug,
    'logo_path', e.logo_path,
    'email', c.email,
    'nome', c.nome,
    'papel', c.papel,
    'expirado', c.expira_em < now(),
    'aceito', c.aceito_em is not null
  )
  from public.convites c
  join public.empresas e on e.id = c.empresa_id and e.ativo
  where c.token = p_token
$$;

create or replace function public.aceitar_convite(p_token uuid, p_nome text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_convite public.convites;
  v_email text;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'Faça login para aceitar o convite' using errcode = '42501';
  end if;
  select * into v_convite from public.convites where token = p_token for update;
  if not found then
    raise exception 'Convite não encontrado' using errcode = 'P0002';
  end if;
  if v_convite.aceito_em is not null then
    raise exception 'Este convite já foi usado' using errcode = 'P0001';
  end if;
  if v_convite.expira_em < now() then
    raise exception 'Este convite expirou: peça um novo ao dono' using errcode = 'P0001';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from v_convite.email then
    raise exception 'Este convite foi enviado para outro e-mail' using errcode = '42501';
  end if;

  insert into public.membros (empresa_id, user_id, nome, papel)
  values (
    v_convite.empresa_id, auth.uid(),
    coalesce(nullif(trim(p_nome), ''), v_convite.nome, split_part(v_email, '@', 1)),
    v_convite.papel
  )
  on conflict (empresa_id, user_id) do update
    set papel = excluded.papel, ativo = true;

  update public.convites set aceito_em = now(), aceito_por = auth.uid() where id = v_convite.id;
  select slug into v_slug from public.empresas where id = v_convite.empresa_id;
  return v_slug;
end;
$$;

-- -----------------------------------------------------------------------------
-- Busca global (clientes, motores/placas, OS). Security invoker: RLS vale.
-- -----------------------------------------------------------------------------
create or replace function public.buscar(p_empresa_id uuid, p_termo text, p_limite integer default 20)
returns table (tipo text, id uuid, titulo text, subtitulo text, os_id uuid, cliente_id uuid, rank real)
language sql
stable
security invoker
set search_path = ''
as $$
  with t as (
    select public.normalizar_busca(trim(p_termo)) as termo,
           public.so_alfanumerico(p_termo) as alfa,
           nullif(regexp_replace(coalesce(p_termo, ''), '\D', '', 'g'), '') as digitos
  ),
  r as (
    -- clientes por nome / fantasia / documento / telefone
    select 'cliente'::text as tipo, c.id, c.nome as titulo,
           concat_ws(' · ', case c.tipo when 'lojista' then 'Lojista' else 'Cliente final' end,
                     c.nome_fantasia, c.telefone_whatsapp) as subtitulo,
           null::uuid as os_id, c.id as cliente_id,
           greatest(
             extensions.similarity(public.normalizar_busca(c.nome), t.termo),
             extensions.similarity(public.normalizar_busca(c.nome_fantasia), t.termo),
             case when t.digitos is not null and length(t.digitos) >= 4
                  and (c.documento like t.digitos || '%' or c.telefone_whatsapp like '%' || t.digitos || '%')
                  then 1 else 0 end
           )::real as rank
    from public.clientes c, t
    where c.empresa_id = p_empresa_id
      and (public.normalizar_busca(c.nome) operator(extensions.%) t.termo
           or public.normalizar_busca(c.nome) like '%' || t.termo || '%'
           or public.normalizar_busca(c.nome_fantasia) like '%' || t.termo || '%'
           or (t.digitos is not null and length(t.digitos) >= 4
               and (c.documento like t.digitos || '%' or c.telefone_whatsapp like '%' || t.digitos || '%')))
    union all
    -- motores por código / série / placa
    select 'motor', m.id,
           concat_ws(' ', m.marca, m.modelo, m.cilindrada),
           concat_ws(' · ', m.codigo_motor, m.numero_serie, m.veiculo_placa),
           null::uuid, m.cliente_id,
           (case when m.veiculo_placa = t.alfa or m.numero_serie = t.alfa or m.codigo_motor = t.alfa then 1
                 else 0.6 end)::real
    from public.motores m, t
    where m.empresa_id = p_empresa_id
      and t.alfa is not null
      and (m.veiculo_placa like t.alfa || '%'
           or public.so_alfanumerico(m.numero_serie) like '%' || t.alfa || '%'
           or public.so_alfanumerico(m.codigo_motor) like t.alfa || '%'
           or public.normalizar_busca(concat_ws(' ', m.marca, m.modelo)) like '%' || t.termo || '%')
    union all
    -- OS por número (aceita "123", "2026-000123") ou placa do cliente do lojista
    select 'os', o.id, 'OS ' || o.numero,
           concat_ws(' · ', c.nome, o.cliente_final_placa, o.status::text),
           o.id, o.cliente_id,
           (case when o.numero = trim(p_termo) then 1 else 0.8 end)::real
    from public.os o
    join public.clientes c on c.id = o.cliente_id, t
    where o.empresa_id = p_empresa_id
      and t.alfa is not null
      and ((t.digitos is not null and (o.numero = trim(p_termo)
              or ltrim(split_part(o.numero, '-', 2), '0') = ltrim(t.digitos, '0')))
           or o.cliente_final_placa like t.alfa || '%')
  )
  select * from r
  where length(coalesce(trim(p_termo), '')) >= 2
  order by rank desc, titulo
  limit greatest(1, least(coalesce(p_limite, 20), 50))
$$;

-- -----------------------------------------------------------------------------
-- Auditoria genérica
-- -----------------------------------------------------------------------------
create or replace function public.tg_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_empresa uuid;
begin
  v_empresa := case when tg_table_name = 'empresas' then (v_row ->> 'id')::uuid
                    else (v_row ->> 'empresa_id')::uuid end;
  -- empresa sendo apagada: nada a auditar
  if not exists (select 1 from public.empresas where id = v_empresa) then
    return null;
  end if;
  insert into public.auditoria (empresa_id, membro_id, user_id, tabela, registro_id, acao, dados_antes, dados_depois)
  values (
    v_empresa,
    public.membro_atual(v_empresa),
    auth.uid(),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'empresas', 'membros', 'convites', 'clientes', 'motores', 'servicos', 'pecas', 'tabelas_preco',
    'tabela_preco_itens', 'kits', 'checklist_templates', 'os', 'orcamentos', 'orcamento_itens', 'apontamentos'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.tg_auditoria()',
      t || '_auditoria', t);
  end loop;
end;
$$;
