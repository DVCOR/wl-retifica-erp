-- =============================================================================
-- Helpers e cenário dos testes SQL (aplicado após migrations + seed).
-- Cada arquivo de teste roda numa transação com ROLLBACK no fim.
-- =============================================================================

create or replace function tests.ok(p_cond boolean, p_msg text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_cond, false) then
    raise exception 'FALHOU: %', p_msg;
  end if;
end;
$$;

-- Espera erro ao executar p_sql (opcionalmente contendo p_trecho na mensagem).
create or replace function tests.erro(p_sql text, p_msg text, p_trecho text default null)
returns void
language plpgsql
as $$
declare
  v_err text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_err = message_text;
    if p_trecho is not null and position(lower(p_trecho) in lower(v_err)) = 0 then
      raise exception 'FALHOU: % (erro inesperado: %)', p_msg, v_err;
    end if;
    return;
  end;
  raise exception 'FALHOU (deveria dar erro): %', p_msg;
end;
$$;

-- Executa p_sql e devolve quantas linhas foram afetadas.
create or replace function tests.linhas(p_sql text)
returns integer
language plpgsql
as $$
declare
  v_n integer;
begin
  execute p_sql;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Conta linhas de uma consulta (com a role/claims atuais).
create or replace function tests.contar(p_sql text)
returns bigint
language plpgsql
as $$
declare
  v_n bigint;
begin
  execute 'select count(*) from (' || p_sql || ') q' into v_n;
  return v_n;
end;
$$;

-- ids auxiliares (executam como postgres: ignoram RLS)
create or replace function tests.empresa(p_slug text)
returns uuid language sql security definer set search_path = '' as $$
  select id from public.empresas where slug = p_slug
$$;

create or replace function tests.membro(p_email text, p_slug text)
returns uuid language sql security definer set search_path = '' as $$
  select m.id from public.membros m join auth.users u on u.id = m.user_id
  join public.empresas e on e.id = m.empresa_id
  where u.email = p_email and e.slug = p_slug
$$;

-- -----------------------------------------------------------------------------
-- Cenário: empresas "alfa" e "beta", um usuário por papel na alfa (+ técnico 2)
-- e um dono na beta. Cada empresa com 1 cliente, 1 motor e 1 OS.
-- -----------------------------------------------------------------------------
create or replace function tests.cenario()
returns void
language plpgsql
as $$
declare
  v_alfa uuid;
  v_beta uuid;
  v_cli_a uuid;
  v_cli_b uuid;
  v_mot_a uuid;
  v_mot_b uuid;
begin
  perform tests.deslogar();

  insert into public.empresas (slug, nome_fantasia) values ('alfa', 'Retífica Alfa') returning id into v_alfa;
  insert into public.empresas (slug, nome_fantasia) values ('beta', 'Retífica Beta') returning id into v_beta;

  insert into public.membros (empresa_id, user_id, nome, papel, limite_desconto_pct) values
    (v_alfa, tests.criar_usuario('a_dono@t.local'), 'Dono A', 'dono', 100),
    (v_alfa, tests.criar_usuario('a_balcao@t.local'), 'Balcão A', 'balcao', 10),
    (v_alfa, tests.criar_usuario('a_tecnico@t.local'), 'Técnico A', 'tecnico', 0),
    (v_alfa, tests.criar_usuario('a_tecnico2@t.local'), 'Técnico A2', 'tecnico', 0),
    (v_alfa, tests.criar_usuario('a_financeiro@t.local'), 'Financeiro A', 'financeiro', 0),
    (v_beta, tests.criar_usuario('b_dono@t.local'), 'Dono B', 'dono', 100);
  perform tests.criar_usuario('sem_empresa@t.local');

  perform public.inicializar_empresa(v_alfa);
  perform public.inicializar_empresa(v_beta);

  insert into public.clientes (empresa_id, tipo, nome, documento, telefone_whatsapp)
    values (v_alfa, 'lojista', 'Oficina do Alfa', '11222333000181', '(11) 98888-1111') returning id into v_cli_a;
  insert into public.clientes (empresa_id, tipo, nome, documento, telefone_whatsapp)
    values (v_beta, 'final', 'Cliente do Beta', '52998224725', '11977772222') returning id into v_cli_b;

  insert into public.motores (empresa_id, cliente_id, marca, modelo, codigo_motor, numero_serie, cilindros, valvulas_por_cilindro, veiculo_placa)
    values (v_alfa, v_cli_a, 'VW', 'AP', 'AP18', 'SERIEALFA1', 4, 2, 'abc-1234') returning id into v_mot_a;
  insert into public.motores (empresa_id, cliente_id, marca, modelo, codigo_motor, numero_serie, cilindros, valvulas_por_cilindro, veiculo_placa)
    values (v_beta, v_cli_b, 'GM', 'Família I', 'C14', 'SERIEBETA1', 4, 2, 'DEF5G67') returning id into v_mot_b;

  perform tests.logar('a_balcao@t.local');
  perform public.criar_os(v_alfa, v_cli_a, v_mot_a, p_cliente_final_placa => 'QWE-1A23');
  perform tests.logar('b_dono@t.local');
  perform public.criar_os(v_beta, v_cli_b, v_mot_b);
  perform tests.deslogar();
end;
$$;

-- Leva a OS até "recebido" (checklist + 3 fotos + assinatura) como balcão.
create or replace function tests.receber_os(p_os_id uuid)
returns void
language plpgsql
as $$
declare
  v_emp uuid;
begin
  select empresa_id into v_emp from public.os where id = p_os_id;
  update public.os set checklist_concluido_em = now() where id = p_os_id;
  insert into public.os_anexos (empresa_id, os_id, etapa, storage_path)
  select v_emp, p_os_id, 'recebimento', v_emp || '/' || p_os_id || '/geral-' || g || '-' || gen_random_uuid() || '.jpg'
  from generate_series(1, 3) g;
  insert into public.os_assinaturas (empresa_id, os_id, tipo, nome, documento)
    values (v_emp, p_os_id, 'recebimento', 'Cliente Teste', '12345678909');
  perform public.alterar_status_os(p_os_id, 'recebido');
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;
