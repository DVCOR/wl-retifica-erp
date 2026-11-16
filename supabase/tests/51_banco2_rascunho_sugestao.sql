-- orcamento_rascunho_para_sugestao(): devolve ou cria o rascunho para o técnico.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_serv uuid;
  v_r1 uuid;
  v_r2 uuid;
begin
  select id into v_os from public.os where empresa_id = v_alfa;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'BLO-RET';

  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format('select public.orcamento_rascunho_para_sugestao(%L)', v_os),
    'OS em recebimento recusa', 'status');

  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);

  perform tests.logar('a_tecnico@t.local');
  v_r1 := public.orcamento_rascunho_para_sugestao(v_os);
  perform tests.ok(v_r1 is not null, 'técnico cria o rascunho');
  perform tests.ok(public.orcamento_rascunho_para_sugestao(v_os) = v_r1, 'segunda chamada devolve o mesmo rascunho');
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade)
    values (v_alfa, v_r1, 'servico', v_serv, 'Sugestão', 1);

  perform tests.logar('a_balcao@t.local');
  perform tests.ok((select versao = 1 and status = 'rascunho' and criado_por = tests.membro('a_tecnico@t.local', 'alfa')
                      from public.orcamentos where id = v_r1), 'versão 1 em rascunho criada pelo técnico');
  perform tests.ok(public.orcamento_rascunho_para_sugestao(v_os) = v_r1, 'balcão recebe o mesmo rascunho');
  perform public.enviar_orcamento(v_r1);

  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format('select public.orcamento_rascunho_para_sugestao(%L)', v_os),
    'orçamento enviado: não cria versão', 'já foi enviado');

  perform tests.logar('a_balcao@t.local');
  perform public.responder_orcamento(v_r1, false, 'Cliente', 'telefone');
  perform tests.logar('a_tecnico@t.local');
  v_r2 := public.orcamento_rascunho_para_sugestao(v_os);
  perform tests.ok(v_r2 <> v_r1, 'reprovado: cria nova versão');
  perform tests.logar('a_balcao@t.local');
  perform tests.ok((select versao from public.orcamentos where id = v_r2) = 2, 'nova versão é a 2');

  perform tests.logar('a_financeiro@t.local');
  perform tests.erro(format('select public.orcamento_rascunho_para_sugestao(%L)', v_os),
    'financeiro não usa', 'permissão');
  perform tests.logar('b_dono@t.local');
  perform tests.erro(format('select public.orcamento_rascunho_para_sugestao(%L)', v_os),
    'outra empresa não usa', 'permissão');
  perform tests.deslogar();
end;
$$;
