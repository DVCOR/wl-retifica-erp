-- Fluxo do quadro/bancada/entrega: movimentação por papel, apontamentos do técnico
-- (sem preço), entrega com assinatura, garantia e OS de garantia.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_serv uuid;
  v_orc uuid;
  v_item uuid;
  v_tec uuid := tests.membro('a_tecnico@t.local', 'alfa');
  v_ap uuid;
  v_gar public.os;
  v_cli uuid;
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
  perform tests.ok((select status from public.os where id = v_os) = 'aprovado', 'OS aprovada');

  -- quadro: arrastar para entregue sem assinatura mostra a pendência
  perform tests.ok(public.os_pendencias_para_status(v_os, 'aprovado') is null, 'sem pendência para aprovado');

  -- técnico atribuído inicia a execução e apontamentos (sem ver preço)
  perform tests.logar('a_tecnico@t.local');
  perform tests.ok((public.alterar_status_os(v_os, 'em_execucao')).status = 'em_execucao', 'técnico inicia execução');
  perform tests.ok(tests.contar(format(
    'select 1 from public.v_orcamento_itens_sem_preco where os_id = %L and orcamento_status = ''aprovado'' and tipo = ''servico''', v_os)) = 1,
    'técnico lê serviços aprovados pela view');
  perform tests.ok(tests.contar('select 1 from public.orcamento_itens') = 0, 'técnico não lê itens com preço');
  insert into public.apontamentos (empresa_id, os_id, membro_id, orcamento_item_id)
    values (v_alfa, v_os, v_tec, v_item) returning id into v_ap;
  perform tests.ok(tests.linhas(format('update public.apontamentos set fim = now() + interval ''30 minutes'' where id = %L', v_ap)) = 1,
    'técnico pausa o próprio apontamento');
  perform tests.erro(format(
    'insert into public.apontamentos (empresa_id, os_id, membro_id) values (%L, %L, %L)',
    v_alfa, v_os, tests.membro('a_dono@t.local', 'alfa')), 'técnico não aponta por outro');
  perform tests.erro(format('select public.alterar_status_os(%L, ''entregue'')', v_os), 'técnico não entrega');
  perform tests.ok((public.alterar_status_os(v_os, 'pronto')).status = 'pronto', 'técnico marca pronta');

  -- entrega: exige assinatura de retirada; garantia calculada a partir de garantia_dias
  perform tests.logar('a_balcao@t.local');
  update public.os set garantia_dias = 60 where id = v_os;
  perform tests.ok(public.os_pendencias_para_status(v_os, 'entregue') ilike '%assinatura de retirada%', 'pendência de entrega');
  perform tests.erro(format('select public.alterar_status_os(%L, ''entregue'')', v_os), 'sem assinatura não entrega', 'retirada');
  insert into public.os_assinaturas (empresa_id, os_id, tipo, nome, documento)
    values (v_alfa, v_os, 'entrega', 'Maria', '12345678909');
  perform public.alterar_status_os(v_os, 'entregue');
  perform tests.ok((select garantia_ate from public.os where id = v_os) = (now() at time zone 'America/Sao_Paulo')::date + 60,
    'garantia de 60 dias a partir da entrega');

  -- OS de garantia vinculada
  select cliente_id into v_cli from public.os where id = v_os;
  v_gar := public.criar_os(v_alfa, v_cli, (select motor_id from public.os where id = v_os), null, null, null, null, null, v_os);
  perform tests.ok(v_gar.eh_garantia and v_gar.os_origem_id = v_os, 'OS de garantia aponta para a origem');
  perform tests.ok(v_gar.status = 'em_recebimento', 'OS de garantia nasce em recebimento');
  perform tests.deslogar();
end;
$$;
