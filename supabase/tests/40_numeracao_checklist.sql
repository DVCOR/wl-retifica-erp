-- Numeração de OS por empresa/ano, imutabilidade e snapshot do checklist.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_beta uuid := tests.empresa('beta');
  v_ano text := extract(year from (now() at time zone 'America/Sao_Paulo'))::int::text;
  v_cli uuid;
  v_os1 public.os;
  v_os2 public.os;
  v_os3 public.os;
  v_id3 uuid;
  v_template uuid;
  v_qtd_template integer;
begin
  select id into v_cli from public.clientes where empresa_id = v_alfa;

  -- cenário já abriu 1 OS em cada empresa
  perform tests.ok((select numero from public.os where empresa_id = v_alfa) = v_ano || '-000001', 'alfa começa em 000001');
  perform tests.ok((select numero from public.os where empresa_id = v_beta) = v_ano || '-000001', 'beta tem sequência própria');

  perform tests.logar('a_balcao@t.local');
  v_os1 := public.criar_os(v_alfa, v_cli);
  v_os2 := public.criar_os(v_alfa, v_cli);
  perform tests.ok(v_os1.numero = v_ano || '-000002', 'segunda OS = 000002');
  perform tests.ok(v_os2.numero = v_ano || '-000003', 'terceira OS = 000003');
  perform tests.ok(v_os1.numero ~ '^\d{4}-\d{6}$', 'formato AAAA-NNNNNN');
  perform tests.ok(v_os1.status = 'em_recebimento', 'OS nasce em recebimento');
  perform tests.ok(v_os1.token_publico is not null and v_os1.token_publico <> v_os2.token_publico, 'token público aleatório');
  perform tests.ok(v_os1.recebido_por = tests.membro('a_balcao@t.local', 'alfa'), 'recebido_por = quem abriu');
  perform tests.ok(v_os1.garantia_dias = 90, 'garantia padrão da config');

  -- inserir pelo app ignora número/status/token informados
  insert into public.os (empresa_id, numero, cliente_id, status, token_publico)
    values (v_alfa, '1999-999999', v_cli, 'entregue', '00000000-0000-0000-0000-000000000000')
    returning id into v_id3;
  -- (o token não é legível por authenticated: confere a linha como postgres)
  perform tests.deslogar();
  select * into v_os3 from public.os where id = v_id3;
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(v_os3.numero = v_ano || '-000004', 'número informado pelo app é ignorado');
  perform tests.ok(v_os3.status = 'em_recebimento', 'status informado no insert é ignorado');
  perform tests.ok(v_os3.token_publico <> '00000000-0000-0000-0000-000000000000', 'token informado é ignorado');

  perform tests.erro(format('update public.os set numero = ''x'' where id = %L', v_os1.id),
    'número é imutável', 'não podem ser alterados');
  perform tests.erro(format('update public.os set token_publico = gen_random_uuid() where id = %L', v_os1.id),
    'token só por regenerar_token_publico', 'regenerar_token_publico');
  perform tests.erro(format('select public.proximo_numero_os(%L)', v_beta), 'balcão da alfa não numera na beta');

  -- histórico criado no insert
  perform tests.ok(exists (select 1 from public.os_status_historico
    where os_id = v_os1.id and status_de is null and status_para = 'em_recebimento'), 'histórico do insert');

  -- snapshot do checklist
  select id into v_template from public.checklist_templates where empresa_id = v_alfa and padrao;
  select count(*) into v_qtd_template from public.checklist_template_itens where template_id = v_template;
  perform tests.ok(v_qtd_template = (select count(*) from public.modelo_checklist_itens), 'template copiado do modelo');
  perform tests.ok((select count(*) from public.os_checklist_itens where os_id = v_os1.id) = v_qtd_template,
    'OS recebeu todos os itens do template');
  perform tests.ok(not exists (select 1 from public.os_checklist_itens where os_id = v_os1.id and status <> 'ok'),
    'tudo começa ok');
  perform tests.ok((select count(distinct grupo) from public.os_checklist_itens where os_id = v_os1.id) = 8,
    '8 grupos do motor completo');
  perform tests.ok((select quantidade from public.os_checklist_itens
                     where os_id = v_os1.id and descricao = 'Válvulas de admissão') = 4, 'quantidade padrão copiada');

  -- marcar grupo inteiro como N/A
  perform tests.ok(tests.linhas(format(
    'update public.os_checklist_itens set status = ''na'' where os_id = %L and grupo = ''Distribuição''', v_os1.id)) = 5,
    'grupo inteiro marcado N/A');

  perform tests.logar('a_dono@t.local');
  update public.checklist_template_itens set descricao = 'ALTERADO' where template_id = v_template;
  perform tests.ok(not exists (select 1 from public.os_checklist_itens where os_id = v_os1.id and descricao = 'ALTERADO'),
    'mudar o template não altera OS antigas');

  -- OS de garantia herda o motor da original
  perform tests.ok((public.criar_os(v_alfa, v_cli, p_os_origem_id => (select id from public.os where empresa_id = v_alfa and numero = v_ano || '-000001'))).eh_garantia,
    'OS de garantia vinculada');
  perform tests.deslogar();
end;
$$;
