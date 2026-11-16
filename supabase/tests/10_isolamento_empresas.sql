-- Isolamento multi-tenant: um usuário da empresa alfa nunca vê nem altera dados da beta.
select tests.cenario();

do $$
declare
  v_beta uuid := tests.empresa('beta');
  v_alfa uuid := tests.empresa('alfa');
  t text;
  v_email text;
  v_cli_beta uuid;
  v_os_beta uuid;
begin
  select id into v_cli_beta from public.clientes where empresa_id = v_beta;
  select id into v_os_beta from public.os where empresa_id = v_beta;

  -- todos os papéis da alfa: zero linhas da beta em todas as tabelas com empresa_id
  foreach v_email in array array['a_dono@t.local', 'a_balcao@t.local', 'a_tecnico@t.local', 'a_financeiro@t.local'] loop
    perform tests.logar(v_email);
    for t in
      select c.table_name from information_schema.columns c
      join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
      where c.table_schema = 'public' and c.column_name = 'empresa_id' and tb.table_type in ('BASE TABLE', 'VIEW')
    loop
      if t in ('os_sequencias') then
        continue;
      end if;
      perform tests.ok(
        tests.contar(format('select 1 from public.%I where empresa_id = %L', t, v_beta)) = 0,
        format('%s não pode ver %s da beta', v_email, t));
    end loop;
    perform tests.ok(tests.contar(format('select 1 from public.empresas where id = %L', v_beta)) = 0,
      v_email || ' não vê a empresa beta');
    perform tests.ok(tests.contar(format('select * from public.buscar(%L, %L)', v_beta, 'Cliente')) = 0,
      v_email || ' não busca na beta');
    perform tests.ok(public.os_pendencias_para_status(v_os_beta, 'recebido') = 'OS não encontrada',
      v_email || ': pendências não revelam OS da beta');
  end loop;

  -- o dono da alfa vê os próprios dados
  perform tests.logar('a_dono@t.local');
  perform tests.ok(tests.contar(format('select 1 from public.clientes where empresa_id = %L', v_alfa)) = 1,
    'dono da alfa vê o cliente da alfa');
  perform tests.ok(tests.contar(format('select 1 from public.servicos where empresa_id = %L', v_alfa)) > 0,
    'dono da alfa vê os serviços da alfa');
  perform tests.ok((select count(*) from public.empresas_do_usuario()) = 1, 'empresas_do_usuario = 1');

  -- escrita na beta: insert falha, update/delete não afetam linhas
  perform tests.erro(format(
    'insert into public.clientes (empresa_id, tipo, nome) values (%L, ''final'', ''Intruso'')', v_beta),
    'dono da alfa não insere cliente na beta');
  perform tests.ok(tests.linhas(format(
    'update public.clientes set nome = ''hack'' where id = %L', v_cli_beta)) = 0,
    'dono da alfa não altera cliente da beta');
  perform tests.ok(tests.linhas(format('delete from public.clientes where id = %L', v_cli_beta)) = 0,
    'dono da alfa não apaga cliente da beta');
  perform tests.ok(tests.linhas(format('update public.empresas set nome_fantasia = ''hack'' where id = %L', v_beta)) = 0,
    'dono da alfa não altera a empresa beta');

  -- referência cruzada: OS da alfa com cliente da beta (FK composta com empresa_id)
  perform tests.erro(format('select public.criar_os(%L, %L)', v_alfa, v_cli_beta),
    'OS da alfa não pode apontar para cliente da beta');
  perform tests.erro(format('select public.criar_os(%L, %L)', v_beta, v_cli_beta),
    'dono da alfa não abre OS na beta', 'permissão');

  -- funções security definer não vazam
  perform tests.erro(format('select public.alterar_status_os(%L, ''cancelado'', ''x'')', v_os_beta),
    'não altera status de OS da beta', 'não encontrada');
  perform tests.erro(format('select public.regenerar_token_publico(%L)', v_os_beta),
    'não regenera token de OS da beta');
  perform tests.erro(format('select public.proximo_numero_os(%L)', v_beta),
    'não consome numeração da beta');
  perform tests.erro(format('select public.inicializar_empresa(%L)', v_beta),
    'não inicializa a beta');
  perform tests.ok(public.preco_sugerido(v_beta, v_cli_beta, null, null) is null,
    'preco_sugerido não revela preço da beta');

  -- usuário sem empresa não vê nada
  perform tests.logar('sem_empresa@t.local');
  perform tests.ok(tests.contar('select 1 from public.empresas') = 0, 'sem empresa: 0 empresas');
  perform tests.ok(tests.contar('select 1 from public.os') = 0, 'sem empresa: 0 OS');
  perform tests.ok(tests.contar('select 1 from public.v_servicos_catalogo') = 0, 'sem empresa: 0 serviços na view');
  perform tests.ok(tests.contar('select 1 from public.modelo_checklist_itens') > 0, 'modelo global é legível');

  -- membro desativado perde o acesso
  perform tests.deslogar();
  update public.membros set ativo = false where id = tests.membro('a_balcao@t.local', 'alfa');
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(tests.contar('select 1 from public.os') = 0, 'membro inativo não vê OS');

  -- anon não lê tabelas
  perform tests.anonimo();
  perform tests.erro('select * from public.clientes', 'anon não lê clientes', 'permission denied');
  perform tests.erro('select * from public.os', 'anon não lê OS', 'permission denied');
  perform tests.erro('select * from public.v_servicos_catalogo', 'anon não lê a view', 'permission denied');
  perform tests.erro(format('select public.criar_os(%L, %L)', v_alfa, v_cli_beta),
    'anon não executa criar_os', 'permission denied');
  perform tests.deslogar();
end;
$$;
