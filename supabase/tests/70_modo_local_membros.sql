-- Modo local: adicionar_membro (dono cria usuário) e proteções do último dono.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_novo uuid;
  v_outro uuid;
  v_membro uuid;
  v_dono uuid;
  v_dono_beta uuid;
begin
  select id into v_dono_beta from auth.users where email = 'b_dono@t.local';
  -- contas criadas "pelo servidor" (GoTrue admin) ainda sem vínculo
  v_novo := tests.criar_usuario('balcao9@wl.local');
  v_outro := tests.criar_usuario('outro9@wl.local');

  -- dono adiciona
  perform tests.logar('a_dono@t.local');
  v_membro := public.adicionar_membro(v_alfa, v_novo, '  Balcão 9  ', 'balcao');
  perform tests.ok(v_membro is not null, 'dono adiciona membro');
  perform tests.ok((select nome from public.membros where id = v_membro) = 'Balcão 9', 'nome aparado');
  perform tests.ok((select papel from public.membros where id = v_membro) = 'balcao', 'papel gravado');
  perform tests.ok((select ativo from public.membros where id = v_membro), 'nasce ativo');

  -- validações
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)', v_alfa, v_novo, 'De novo', 'balcao'),
    'não duplica membro', 'já faz parte');
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)', v_alfa, v_outro, '   ', 'balcao'),
    'nome obrigatório', 'nome');
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)', v_alfa, gen_random_uuid(), 'Fantasma', 'balcao'),
    'usuário inexistente', 'não encontrado');
  -- usuário que já é de outra empresa não é "puxado"
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)',
      v_alfa, v_dono_beta, 'Do beta', 'tecnico'),
    'não puxa usuário de outra empresa', 'outra empresa');

  -- não-dono não adiciona
  perform tests.logar('a_balcao@t.local');
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)', v_alfa, v_outro, 'X', 'balcao'),
    'balcão não adiciona', 'Só o dono');
  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)', v_alfa, v_outro, 'X', 'balcao'),
    'técnico não adiciona', 'Só o dono');

  -- dono de OUTRA empresa não adiciona na alfa
  perform tests.logar('b_dono@t.local');
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)', v_alfa, v_outro, 'X', 'balcao'),
    'dono da beta não adiciona na alfa', 'Só o dono');

  -- anônimo não executa
  perform tests.anonimo();
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)', v_alfa, v_outro, 'X', 'balcao'),
    'anon não executa');

  -- novo usuário entra e enxerga a empresa; sem poder de dono
  perform tests.logar('balcao9@wl.local');
  perform tests.ok(public.papel_na_empresa(v_alfa) = 'balcao', 'novo usuário é balcão da alfa');
  perform tests.erro(format('select public.adicionar_membro(%L, %L, %L, %L)', v_alfa, v_outro, 'X', 'balcao'),
    'novo balcão não adiciona', 'Só o dono');

  -- dono muda papel e desativa (RLS de membros_update) e o usuário perde acesso
  perform tests.logar('a_dono@t.local');
  perform tests.ok(tests.linhas(format('update public.membros set papel = %L where id = %L', 'tecnico', v_membro)) = 1,
    'dono muda o papel');
  perform tests.ok(tests.linhas(format('update public.membros set ativo = false where id = %L', v_membro)) = 1,
    'dono desativa');
  perform tests.logar('balcao9@wl.local');
  perform tests.ok(public.papel_na_empresa(v_alfa) is null, 'desativado não tem papel');

  -- último dono: não rebaixa nem desativa
  perform tests.logar('a_dono@t.local');
  v_dono := tests.membro('a_dono@t.local', 'alfa');
  perform tests.erro(format('update public.membros set papel = %L where id = %L', 'balcao', v_dono),
    'último dono não vira balcão', 'ao menos um dono');
  perform tests.erro(format('update public.membros set ativo = false where id = %L', v_dono),
    'último dono não se desativa', 'ao menos um dono');
end;
$$;
