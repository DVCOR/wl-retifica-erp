-- os_publica_fotos(): devolve medicao_id e etapa; só service_role.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_token uuid;
  v_med uuid;
begin
  select id, token_publico into v_os, v_token from public.os where empresa_id = v_alfa;

  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);
  perform tests.logar('a_tecnico@t.local');
  insert into public.os_medicoes (empresa_id, os_id, componente, descricao, valor, minimo, maximo)
    values (v_alfa, v_os, 'Bloco', 'Cilindro 1', 82.6, 82.5, 82.55) returning id into v_med;
  insert into public.os_anexos (empresa_id, os_id, medicao_id, etapa, storage_path)
    values (v_alfa, v_os, v_med, 'analise', v_alfa || '/' || v_os || '/medicao.jpg');

  perform tests.erro(format('select * from public.os_publica_fotos(%L)', v_token),
    'autenticado não executa os_publica_fotos', 'permission');
  perform tests.deslogar();

  perform tests.ok((select count(*) from public.os_publica_fotos(v_token)) = 4, '3 fotos de recebimento + 1 de medição');
  perform tests.ok((select medicao_id = v_med and etapa = 'analise'
                      from public.os_publica_fotos(v_token) where storage_path like '%medicao.jpg'),
    'foto da medição traz medicao_id e etapa');
  perform tests.ok((select count(*) from public.os_publica_fotos(v_token) where medicao_id is null) = 3,
    'fotos gerais sem medição');
end;
$$;
