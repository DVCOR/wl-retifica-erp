-- Versões do orçamento, limite de desconto, medições do técnico e página pública.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_serv uuid;
  v_orc1 uuid;
  v_orc2 uuid;
  v_med uuid;
  v_token uuid;
  v_pub jsonb;
begin
  select id into v_os from public.os where empresa_id = v_alfa;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'CAB-FACE';

  -- técnico registra medições; conformidade numérica é automática, teste preserva o valor informado
  perform tests.logar('a_tecnico@t.local');
  insert into public.os_medicoes (empresa_id, os_id, componente, descricao, valor, unidade, minimo, maximo)
    values (v_alfa, v_os, 'Cabeçote', 'Empenamento da face', 0.25, 'mm', 0, 0.10) returning id into v_med;
  perform tests.ok((select conforme from public.os_medicoes where id = v_med) = false, 'medição fora da faixa = não conforme');
  insert into public.os_medicoes (empresa_id, os_id, componente, descricao, valor_texto, conforme)
    values (v_alfa, v_os, 'Cabeçote', 'Teste de trinca', 'Reprovado', false);
  perform tests.ok(tests.contar(format('select 1 from public.os_medicoes where os_id = %L and conforme = false', v_os)) = 2,
    'teste reprovado fica não conforme');

  -- balcão: versão 1, limite de desconto e aprovação do dono
  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc1;
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario)
    values (v_alfa, v_orc1, 'servico', v_serv, 'Plainar face', 1, 200);
  update public.orcamentos set desconto = 100 where id = v_orc1;
  perform tests.erro(format('select public.enviar_orcamento(%L)', v_orc1), 'desconto acima do limite do balcão', 'limite');

  perform tests.logar('a_dono@t.local');
  update public.orcamentos set desconto_aprovado_por = tests.membro('a_dono@t.local', 'alfa') where id = v_orc1;
  perform tests.logar('a_balcao@t.local');
  perform public.enviar_orcamento(v_orc1);
  perform tests.ok((select status from public.os where id = v_os) = 'orcamento_enviado', 'OS em orçamento enviado');

  -- nova versão: anterior vira substituída; técnico não enxerga rascunho vazio, mas insere em rascunho com itens
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc2;
  perform tests.ok((select versao from public.orcamentos where id = v_orc2) = 2, 'segunda versão');
  perform tests.ok((select status from public.orcamentos where id = v_orc1) = 'substituido', 'versão 1 substituída');
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario)
    values (v_alfa, v_orc2, 'servico', v_serv, 'Plainar face', 1, 200);

  perform tests.logar('a_tecnico@t.local');
  perform tests.ok((select orcamento_id from public.v_orcamento_itens_sem_preco
                     where os_id = v_os order by versao desc limit 1) = v_orc2, 'técnico acha o rascunho pela view');
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, sugerido_por_medicao_id)
    values (v_alfa, v_orc2, 'servico', v_serv, 'Retificar face (sugestão)', 1, v_med);

  perform tests.logar('a_balcao@t.local');
  perform tests.ok((select sugerido_por_medicao_id from public.orcamento_itens
                     where orcamento_id = v_orc2 and descricao like 'Retificar%') = v_med, 'sugestão ligada à medição');
  perform public.enviar_orcamento(v_orc2);

  -- página pública: medições e orçamento vigente, sem dados pessoais
  v_token := public.os_link_publico(v_os);
  perform tests.anonimo();
  v_pub := public.os_publica(v_token);
  perform tests.ok((v_pub -> 'orcamento' ->> 'versao')::int = 2, 'público vê a versão vigente');
  perform tests.ok(jsonb_array_length(v_pub -> 'medicoes') = 2, 'público vê as medições');
  perform tests.ok(v_pub::text not like '%documento%' and v_pub::text not like '%telefone_whatsapp%',
    'público sem documento do cliente');
  perform tests.ok(public.os_publica(gen_random_uuid()) is null, 'token inválido não devolve nada');
  perform tests.deslogar();
end;
$$;
