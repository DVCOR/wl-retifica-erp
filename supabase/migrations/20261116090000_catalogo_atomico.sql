-- =============================================================================
-- Catálogo: gravações atômicas (kit + itens, preços da tabela, tabela padrão).
-- Todas security invoker: a RLS (escrita só do dono) continua valendo; a
-- checagem explícita de papel só serve para dar uma mensagem clara.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- salvar_kit: cria (p_kit_id null) ou atualiza o kit e SUBSTITUI os itens.
--   p_dados: {"empresa_id": uuid (só na criação), "nome": text, "descricao": text|null, "ativo"?: bool}
--   p_itens: [{"tipo": "servico"|"peca", "id": uuid, "quantidade": numeric}, ...] (ordem = posição)
-- Devolve o id do kit.
-- -----------------------------------------------------------------------------
create or replace function public.salvar_kit(p_kit_id uuid, p_dados jsonb, p_itens jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_kit uuid := p_kit_id;
  v_nome text := nullif(trim(coalesce(p_dados ->> 'nome', '')), '');
  v_qtd_itens integer;
  v_distintos integer;
begin
  if v_nome is null then
    raise exception 'Informe o nome do kit' using errcode = 'P0001';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione ao menos um item ao kit' using errcode = 'P0001';
  end if;

  if v_kit is null then
    v_empresa := nullif(p_dados ->> 'empresa_id', '')::uuid;
    if v_empresa is null then
      raise exception 'Empresa não informada' using errcode = 'P0001';
    end if;
  else
    select empresa_id into v_empresa from public.kits where id = v_kit;
    if v_empresa is null then
      raise exception 'Kit não encontrado' using errcode = 'P0002';
    end if;
  end if;

  if not public.tem_papel(v_empresa, array['dono']::public.papel[]) then
    raise exception 'Só o dono altera o catálogo e os preços.' using errcode = '42501';
  end if;

  select count(*), count(distinct (x.tipo, x.id))
    into v_qtd_itens, v_distintos
  from jsonb_to_recordset(p_itens) as x(tipo text, id uuid, quantidade numeric);
  if v_distintos <> v_qtd_itens then
    raise exception 'Há itens repetidos no kit' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_itens) as x(tipo text, id uuid, quantidade numeric)
    where x.tipo is null or x.tipo not in ('servico', 'peca') or x.id is null
  ) then
    raise exception 'Item do kit inválido' using errcode = 'P0001';
  end if;

  if v_kit is null then
    insert into public.kits (empresa_id, nome, descricao, ativo)
    values (v_empresa, v_nome, nullif(trim(coalesce(p_dados ->> 'descricao', '')), ''),
            coalesce((p_dados ->> 'ativo')::boolean, true))
    returning id into v_kit;
  else
    update public.kits
       set nome = v_nome,
           descricao = nullif(trim(coalesce(p_dados ->> 'descricao', '')), ''),
           ativo = coalesce((p_dados ->> 'ativo')::boolean, ativo)
     where id = v_kit;
    if not found then
      raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
    end if;
    delete from public.kit_itens where kit_id = v_kit;
  end if;

  -- FKs compostas garantem que serviço/peça são da mesma empresa.
  insert into public.kit_itens (empresa_id, kit_id, servico_id, peca_id, quantidade, ordem)
  select v_empresa, v_kit,
         case when x.tipo = 'servico' then x.id end,
         case when x.tipo = 'peca' then x.id end,
         coalesce(x.quantidade, 1),
         (n - 1)::integer
  from rows from (jsonb_to_recordset(p_itens) as (tipo text, id uuid, quantidade numeric))
         with ordinality as x(tipo, id, quantidade, n);

  return v_kit;
end;
$$;

-- -----------------------------------------------------------------------------
-- salvar_precos_tabela: upsert/remoção de preços específicos de uma tabela.
--   p_precos: [{"tipo": "servico"|"peca", "id": uuid, "preco": numeric|null}, ...]
--   preco null = remove o preço específico (volta ao desconto da tabela).
-- Devolve quantos itens foram gravados/removidos.
-- -----------------------------------------------------------------------------
create or replace function public.salvar_precos_tabela(p_tabela_id uuid, p_precos jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_removidos integer := 0;
  v_gravados integer := 0;
  v_pecas integer := 0;
begin
  select empresa_id into v_empresa from public.tabelas_preco where id = p_tabela_id;
  if v_empresa is null then
    raise exception 'Tabela de preço não encontrada' using errcode = 'P0002';
  end if;
  if not public.tem_papel(v_empresa, array['dono']::public.papel[]) then
    raise exception 'Só o dono altera o catálogo e os preços.' using errcode = '42501';
  end if;
  if p_precos is null or jsonb_typeof(p_precos) <> 'array' then
    raise exception 'Lista de preços inválida' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_precos) as x(tipo text, id uuid, preco numeric)
    where x.tipo is null or x.tipo not in ('servico', 'peca') or x.id is null
  ) then
    raise exception 'Item de preço inválido' using errcode = 'P0001';
  end if;

  -- remoções
  delete from public.tabela_preco_itens t
  using jsonb_to_recordset(p_precos) as x(tipo text, id uuid, preco numeric)
  where t.tabela_preco_id = p_tabela_id
    and x.preco is null
    and ((x.tipo = 'servico' and t.servico_id = x.id) or (x.tipo = 'peca' and t.peca_id = x.id));
  get diagnostics v_removidos = row_count;

  -- serviços
  insert into public.tabela_preco_itens (empresa_id, tabela_preco_id, servico_id, preco)
  select distinct on (x.id) v_empresa, p_tabela_id, x.id, x.preco
  from rows from (jsonb_to_recordset(p_precos) as (tipo text, id uuid, preco numeric))
       with ordinality as x(tipo, id, preco, n)
  where x.tipo = 'servico' and x.preco is not null
  order by x.id, x.n desc
  on conflict (tabela_preco_id, servico_id) where servico_id is not null
  do update set preco = excluded.preco
  where public.tabela_preco_itens.preco is distinct from excluded.preco;
  get diagnostics v_gravados = row_count;

  -- peças
  insert into public.tabela_preco_itens (empresa_id, tabela_preco_id, peca_id, preco)
  select distinct on (x.id) v_empresa, p_tabela_id, x.id, x.preco
  from rows from (jsonb_to_recordset(p_precos) as (tipo text, id uuid, preco numeric))
       with ordinality as x(tipo, id, preco, n)
  where x.tipo = 'peca' and x.preco is not null
  order by x.id, x.n desc
  on conflict (tabela_preco_id, peca_id) where peca_id is not null
  do update set preco = excluded.preco
  where public.tabela_preco_itens.preco is distinct from excluded.preco;
  get diagnostics v_pecas = row_count;

  return v_removidos + v_gravados + v_pecas;
end;
$$;

-- -----------------------------------------------------------------------------
-- definir_tabela_padrao: a tabela passa a ser a padrão do tipo de cliente
-- (a anterior deixa de ser) numa única transação. p_tipo null = deixa de ser padrão.
-- -----------------------------------------------------------------------------
create or replace function public.definir_tabela_padrao(p_tabela_id uuid, p_tipo public.cliente_tipo)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tabela record;
begin
  select id, empresa_id, padrao_para, ativo into v_tabela
  from public.tabelas_preco where id = p_tabela_id;
  if v_tabela.id is null then
    raise exception 'Tabela de preço não encontrada' using errcode = 'P0002';
  end if;
  if not public.tem_papel(v_tabela.empresa_id, array['dono']::public.papel[]) then
    raise exception 'Só o dono altera o catálogo e os preços.' using errcode = '42501';
  end if;
  if v_tabela.padrao_para is not distinct from p_tipo then
    return;
  end if;
  if p_tipo is not null and not v_tabela.ativo then
    raise exception 'Ative a tabela antes de torná-la padrão' using errcode = 'P0001';
  end if;

  if p_tipo is not null then
    update public.tabelas_preco
       set padrao_para = null
     where empresa_id = v_tabela.empresa_id and padrao_para = p_tipo and id <> p_tabela_id;
  end if;
  update public.tabelas_preco set padrao_para = p_tipo where id = p_tabela_id;
end;
$$;

revoke execute on function
  public.salvar_kit(uuid, jsonb, jsonb),
  public.salvar_precos_tabela(uuid, jsonb),
  public.definir_tabela_padrao(uuid, public.cliente_tipo)
from public, anon;
grant execute on function
  public.salvar_kit(uuid, jsonb, jsonb),
  public.salvar_precos_tabela(uuid, jsonb),
  public.definir_tabela_padrao(uuid, public.cliente_tipo)
to authenticated, service_role;
