-- Endurecimento: técnico só conclui item e aponta em OS dele (ou sem técnico → assume).
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_serv uuid;
  v_orc uuid;
  v_item uuid;
  v_tec uuid := tests.membro('a_tecnico@t.local', 'alfa');
  v_tec2 uuid := tests.membro('a_tecnico2@t.local', 'alfa');
begin
  select id into v_os from public.os where empresa_id = v_alfa;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'BLO-RET';

  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);
  update public.os set tecnico_id = v_tec where id = v_os;
  perform public.alterar_status_os(v_os, 'em_analise');
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc;
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario)
    values (v_alfa, v_orc, 'servico', v_serv, 'Retificar cilindro', 4, 100) returning id into v_item;
  perform public.enviar_orcamento(v_orc);
  perform public.responder_orcamento(v_orc, true, 'Cliente', 'whatsapp');
  perform public.alterar_status_os(v_os, 'em_execucao');

  -- outro técnico não conclui nem aponta
  perform tests.logar('a_tecnico2@t.local');
  perform tests.erro(format('select public.marcar_item_concluido(%L, true)', v_item),
    'técnico de outra OS não conclui item', 'outro técnico');
  perform tests.erro(format('insert into public.apontamentos (empresa_id, os_id, membro_id) values (%L, %L, %L)', v_alfa, v_os, v_tec2),
    'técnico de outra OS não aponta', 'outro técnico');

  -- o atribuído pode
  perform tests.logar('a_tecnico@t.local');
  perform public.marcar_item_concluido(v_item, true);
  perform tests.ok(tests.linhas(format('insert into public.apontamentos (empresa_id, os_id, membro_id) values (%L, %L, %L)', v_alfa, v_os, v_tec)) = 1,
    'técnico atribuído aponta');

  -- balcão segue livre
  perform tests.logar('a_balcao@t.local');
  perform public.marcar_item_concluido(v_item, false);

  -- OS sem técnico: o primeiro técnico que aponta assume
  update public.os set tecnico_id = null where id = v_os;
  perform tests.logar('a_tecnico2@t.local');
  perform tests.ok(tests.linhas(format('insert into public.apontamentos (empresa_id, os_id, membro_id) values (%L, %L, %L)', v_alfa, v_os, v_tec2)) = 1,
    'técnico aponta em OS sem técnico');
  perform tests.deslogar();
  perform tests.ok((select tecnico_id from public.os where id = v_os) = v_tec2, 'técnico assumiu a OS');
end $$;
