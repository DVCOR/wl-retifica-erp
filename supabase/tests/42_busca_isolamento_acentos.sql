-- Busca global: não vaza dados entre empresas, respeita acentos e papéis.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_beta uuid := tests.empresa('beta');
begin
  perform tests.deslogar();
  insert into public.clientes (empresa_id, tipo, nome) values (v_alfa, 'final', 'José da Conceição');
  insert into public.clientes (empresa_id, tipo, nome) values (v_beta, 'final', 'José Beta Exclusivo');

  -- acentos: com ou sem, maiúsculas ou minúsculas
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, 'jose conceicao') where tipo = 'cliente' and titulo = 'José da Conceição')
                   or exists (select 1 from public.buscar(v_alfa, 'conceicao') where tipo = 'cliente' and titulo = 'José da Conceição'),
                   'termo sem acento acha nome acentuado');
  perform tests.ok(exists (select 1 from public.buscar(v_alfa, 'CONCEIÇÃO') where titulo = 'José da Conceição'),
                   'termo acentuado em maiúsculas acha o cliente');

  -- isolamento: dados da beta não aparecem, nem pedindo a empresa da beta
  perform tests.ok(not exists (select 1 from public.buscar(v_alfa, 'Beta') where titulo ilike '%beta%'),
                   'busca na alfa não traz clientes da beta');
  perform tests.ok(not exists (select 1 from public.buscar(v_alfa, 'DEF5G67')), 'placa da beta não aparece na alfa');
  perform tests.ok(tests.contar(format('select 1 from public.buscar(%L, %L)', v_beta, 'Beta')) = 0,
                   'membro da alfa pedindo a empresa beta recebe vazio');
  perform tests.ok(tests.contar(format('select 1 from public.buscar(%L, %L)', v_beta, 'SERIEBETA1')) = 0,
                   'série da beta invisível para a alfa');

  -- o dono da beta enxerga o seu e não o da alfa
  perform tests.logar('b_dono@t.local');
  perform tests.ok(exists (select 1 from public.buscar(v_beta, 'Exclusivo') where tipo = 'cliente'), 'beta acha o seu cliente');
  perform tests.ok(tests.contar(format('select 1 from public.buscar(%L, %L)', v_beta, 'Conceicao')) = 0, 'beta não acha cliente da alfa');
  perform tests.ok(tests.contar(format('select 1 from public.buscar(%L, %L)', v_alfa, 'Conceicao')) = 0, 'beta não consulta a alfa');

  -- anônimo não busca
  perform tests.anonimo();
  perform tests.erro(format('select * from public.buscar(%L, %L)', v_alfa, 'Conceicao'), 'anônimo não executa buscar');
  perform tests.deslogar();
end;
$$;
