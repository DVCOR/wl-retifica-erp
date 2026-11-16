-- =============================================================================
-- Listagens paginadas com busca sem acento (unaccent + pg_trgm) e resumo do
-- cliente. Security invoker: a RLS vale.
-- =============================================================================

-- Busca por trecho de placa (like '%...%').
create index if not exists motores_placa_trgm on public.motores
  using gin (veiculo_placa extensions.gin_trgm_ops);
create index if not exists os_cliente_final_placa_trgm on public.os
  using gin (cliente_final_placa extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- listar_clientes: nome, fantasia (sem acento, por trecho ou similaridade),
-- documento e telefone (dígitos, ≥ 3), placa de motores do cliente e de OS
-- (cliente do lojista). `total` = total de linhas do filtro (igual em todas).
-- -----------------------------------------------------------------------------
create or replace function public.listar_clientes(
  p_empresa_id uuid,
  p_termo text default null,
  p_tipo public.cliente_tipo default null,
  p_ativo boolean default null,
  p_limite integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  tipo public.cliente_tipo,
  nome text,
  nome_fantasia text,
  documento text,
  telefone_whatsapp text,
  ativo boolean,
  os_em_andamento integer,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with t as (
    select nullif(public.normalizar_busca(trim(coalesce(p_termo, ''))), '') as termo,
           public.so_alfanumerico(p_termo) as alfa,
           nullif(regexp_replace(coalesce(p_termo, ''), '\D', '', 'g'), '') as digitos
  ),
  f as (
    select c.*,
           case when t.termo is null then 0 else greatest(
             extensions.similarity(public.normalizar_busca(c.nome), t.termo),
             extensions.similarity(public.normalizar_busca(c.nome_fantasia), t.termo),
             case when public.normalizar_busca(c.nome) like t.termo || '%' then 1 else 0 end,
             case when t.digitos is not null and length(t.digitos) >= 3
                  and (c.documento like '%' || t.digitos || '%' or c.telefone_whatsapp like '%' || t.digitos || '%')
                  then 0.9 else 0 end
           ) end::real as rank
    from public.clientes c, t
    where c.empresa_id = p_empresa_id
      and (p_tipo is null or c.tipo = p_tipo)
      and (p_ativo is null or c.ativo = p_ativo)
      and (
        t.termo is null
        or public.normalizar_busca(c.nome) like '%' || t.termo || '%'
        or public.normalizar_busca(c.nome_fantasia) like '%' || t.termo || '%'
        or (length(t.termo) >= 3 and public.normalizar_busca(c.nome) operator(extensions.%) t.termo)
        or (t.digitos is not null and length(t.digitos) >= 3
            and (c.documento like '%' || t.digitos || '%' or c.telefone_whatsapp like '%' || t.digitos || '%'))
        or (t.alfa is not null and length(t.alfa) >= 3 and (
              exists (select 1 from public.motores m
                      where m.empresa_id = p_empresa_id and m.cliente_id = c.id
                        and m.veiculo_placa like '%' || t.alfa || '%')
              or exists (select 1 from public.os o
                         where o.empresa_id = p_empresa_id and o.cliente_id = c.id
                           and o.cliente_final_placa like '%' || t.alfa || '%')))
      )
  )
  select f.id, f.tipo, f.nome, f.nome_fantasia, f.documento, f.telefone_whatsapp, f.ativo,
         (select count(*)::integer from public.os o
           where o.empresa_id = p_empresa_id and o.cliente_id = f.id
             and o.status in ('recebido', 'em_analise', 'orcamento_enviado', 'aprovado',
                              'em_execucao', 'aguardando_peca', 'pronto')) as os_em_andamento,
         count(*) over () as total
  from f
  order by f.rank desc, f.nome, f.id
  limit greatest(1, least(coalesce(p_limite, 20), 200))
  offset greatest(0, coalesce(p_offset, 0))
$$;

-- -----------------------------------------------------------------------------
-- listar_motores: marca, modelo, código, nº de série, veículo e nome do cliente
-- (sem acento), placa por trecho. Com p_cliente_id: sem termo lista só os
-- motores do cliente; com termo lista todos que casam, os do cliente primeiro.
-- -----------------------------------------------------------------------------
create or replace function public.listar_motores(
  p_empresa_id uuid,
  p_termo text default null,
  p_cliente_id uuid default null,
  p_limite integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  empresa_id uuid,
  cliente_id uuid,
  marca text,
  modelo text,
  codigo_motor text,
  numero_serie text,
  combustivel public.combustivel,
  cilindros smallint,
  cilindrada text,
  valvulas_por_cilindro smallint,
  veiculo_placa text,
  veiculo_modelo text,
  veiculo_ano smallint,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz,
  cliente_nome text,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with t as (
    select nullif(public.normalizar_busca(trim(coalesce(p_termo, ''))), '') as termo,
           public.so_alfanumerico(p_termo) as alfa
  ),
  f as (
    select m.*, c.nome as cliente_nome,
           case when t.termo is null then 0 else greatest(
             case when m.veiculo_placa = t.alfa or m.numero_serie = t.alfa or m.codigo_motor = t.alfa then 1 else 0 end,
             extensions.similarity(public.normalizar_busca(concat_ws(' ', m.marca, m.modelo, m.codigo_motor)), t.termo)
           ) end::real as rank
    from public.motores m
    left join public.clientes c on c.id = m.cliente_id
    cross join t
    where m.empresa_id = p_empresa_id
      and (t.termo is not null or p_cliente_id is null or m.cliente_id = p_cliente_id)
      and (
        t.termo is null
        or public.normalizar_busca(concat_ws(' ', m.marca, m.modelo, m.codigo_motor, m.numero_serie,
                                             m.veiculo_modelo, c.nome)) like '%' || t.termo || '%'
        or (t.alfa is not null and (
              m.veiculo_placa like '%' || t.alfa || '%'
              or public.so_alfanumerico(m.numero_serie) like '%' || t.alfa || '%'
              or public.so_alfanumerico(m.codigo_motor) like '%' || t.alfa || '%'))
      )
  )
  select f.id, f.empresa_id, f.cliente_id, f.marca, f.modelo, f.codigo_motor, f.numero_serie,
         f.combustivel, f.cilindros, f.cilindrada, f.valvulas_por_cilindro, f.veiculo_placa,
         f.veiculo_modelo, f.veiculo_ano, f.observacoes, f.created_at, f.updated_at,
         f.cliente_nome, count(*) over () as total
  from f
  order by (p_cliente_id is not null and f.cliente_id = p_cliente_id) desc,
           f.rank desc, f.created_at desc, f.id
  limit greatest(1, least(coalesce(p_limite, 20), 200))
  offset greatest(0, coalesce(p_offset, 0))
$$;

-- -----------------------------------------------------------------------------
-- resumo_cliente: números da ficha do cliente (ignora OS em_recebimento).
--   em_aberto: soma dos orçamentos aprovados de OS aprovadas/em execução/
--   aguardando peça/prontas; null para quem não pode ver preço.
--   motores_em_garantia: motores (ou OS sem motor) entregues com garantia vigente.
-- -----------------------------------------------------------------------------
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
    select os.* from public.os os join c on c.id = os.cliente_id and c.empresa_id = os.empresa_id
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

revoke execute on function
  public.listar_clientes(uuid, text, public.cliente_tipo, boolean, integer, integer),
  public.listar_motores(uuid, text, uuid, integer, integer),
  public.resumo_cliente(uuid)
from public, anon;
grant execute on function
  public.listar_clientes(uuid, text, public.cliente_tipo, boolean, integer, integer),
  public.listar_motores(uuid, text, uuid, integer, integer),
  public.resumo_cliente(uuid)
to authenticated, service_role;
