-- Convites, criação de empresa e busca global.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_token uuid;
  v_info jsonb;
  v_emp public.empresas;
begin
  perform tests.logar('a_dono@t.local');
  insert into public.convites (empresa_id, email, nome, papel) values (v_alfa, 'novo@t.local', 'Novo', 'tecnico')
    returning token into v_token;

  perform tests.anonimo();
  v_info := public.convite_info(v_token);
  perform tests.ok(v_info ->> 'empresa_nome' = 'Retífica Alfa' and v_info ->> 'papel' = 'tecnico', 'convite_info para anon');
  perform tests.ok(public.convite_info(gen_random_uuid()) is null, 'token de convite inválido');
  perform tests.erro(format('select public.aceitar_convite(%L)', v_token), 'anon não aceita convite');

  perform tests.deslogar();
  perform tests.criar_usuario('novo@t.local');
  perform tests.logar('b_dono@t.local');
  perform tests.erro(format('select public.aceitar_convite(%L)', v_token), 'outro e-mail não aceita', 'outro e-mail');

  perform tests.logar('novo@t.local');
  perform tests.ok(public.aceitar_convite(v_token) = 'alfa', 'aceitar devolve o slug');
  perform tests.ok(public.papel_na_empresa(v_alfa) = 'tecnico', 'virou técnico da alfa');
  perform tests.ok(tests.contar('select 1 from public.os') = 1, 'agora vê as OS da alfa');
  perform tests.erro(format('select public.aceitar_convite(%L)', v_token), 'convite não é reutilizável', 'já foi usado');

  -- convite expirado
  perform tests.logar('a_dono@t.local');
  insert into public.convites (empresa_id, email, papel, expira_em)
    values (v_alfa, 'sem_empresa@t.local', 'balcao', now() - interval '1 day') returning token into v_token;
  perform tests.logar('sem_empresa@t.local');
  perform tests.erro(format('select public.aceitar_convite(%L)', v_token), 'convite expirado', 'expirou');

  -- criar empresa: vira dono e recebe o modelo padrão
  v_emp := public.criar_empresa('Retífica Gama', 'gama', 'Gabriel');
  perform tests.ok(public.papel_na_empresa(v_emp.id) = 'dono', 'criador é dono');
  perform tests.ok((select count(*) from public.checklist_template_itens where empresa_id = v_emp.id)
                   = (select count(*) from public.modelo_checklist_itens), 'checklist padrão copiado');
  perform tests.ok((select count(*) from public.servicos where empresa_id = v_emp.id) = 20, 'catálogo copiado');
  perform tests.ok((select count(*) from public.kit_itens where empresa_id = v_emp.id) = 6, 'kit de exemplo');
  perform public.inicializar_empresa(v_emp.id);
  perform tests.ok((select count(*) from public.checklist_templates where empresa_id = v_emp.id) = 1, 'inicializar é idempotente');
  perform tests.erro('select public.criar_empresa(''Outra'', ''alfa'', ''x'')', 'slug único');

  -- busca global (só na própria empresa)
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, 'oficina') where tipo = 'cliente'), 'busca por nome sem acento');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, 'ABC1234') where tipo = 'motor'), 'busca por placa');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, 'serieal') where tipo = 'motor'), 'busca por série');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, '1') where tipo = 'os') is false, 'termo curto não busca');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, '000001') where tipo = 'os'), 'busca por nº da OS');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, 'qwe1a23') where tipo = 'os'), 'busca pela placa do cliente do lojista');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, '98888') where tipo = 'cliente'), 'busca por telefone');
  perform tests.deslogar();
end;
$$;
