-- Conclusão de item de serviço: coluna própria + marcar_item_concluido().
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_serv uuid;
  v_orc uuid;
  v_item uuid;
  v_tec uuid := tests.membro('a_tecnico@t.local', 'alfa');
  v_total numeric;
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
  perform tests.erro(format('update public.orcamento_itens set concluido_em = now() where id = %L', v_item),
    'conclusão não é gravada direto', 'marcar_item_concluido');
  perform public.enviar_orcamento(v_orc);
  perform public.responder_orcamento(v_orc, true, 'Cliente', 'whatsapp');
  select total into v_total from public.orcamento_itens where id = v_item;

  -- fora de execução: recusa
  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format('select public.marcar_item_concluido(%L, true)', v_item),
    'não conclui com a OS aprovada (antes da execução)', 'em execução');
  perform public.alterar_status_os(v_os, 'em_execucao');

  perform public.marcar_item_concluido(v_item, true);
  perform tests.ok((select concluido_em is not null and concluido_por = v_tec
                      from public.v_orcamento_itens_sem_preco where id = v_item),
    'técnico conclui e a view mostra concluido_em/concluido_por');
  perform tests.ok(tests.linhas(format('update public.orcamento_itens set concluido_em = null where id = %L', v_item)) = 0,
    'técnico não altera item direto');

  perform tests.logar('a_balcao@t.local');
  perform tests.ok((select total from public.orcamento_itens where id = v_item) = v_total,
    'concluir pelo técnico não mexe no preço');
  perform public.marcar_item_concluido(v_item, false);
  perform tests.ok((select concluido_em is null and concluido_por is null from public.orcamento_itens where id = v_item),
    'balcão reabre o item');

  perform tests.logar('a_financeiro@t.local');
  perform tests.erro(format('select public.marcar_item_concluido(%L, true)', v_item),
    'financeiro não conclui', 'permissão');
  perform tests.logar('b_dono@t.local');
  perform tests.erro(format('select public.marcar_item_concluido(%L, true)', v_item),
    'outra empresa não conclui', 'permissão');

  perform tests.logar('a_tecnico@t.local');
  perform public.alterar_status_os(v_os, 'aguardando_peca');
  perform public.marcar_item_concluido(v_item, true);
  perform tests.ok((select concluido_em is not null from public.v_orcamento_itens_sem_preco where id = v_item),
    'conclui aguardando peça');
  perform tests.deslogar();
end;
$$;
