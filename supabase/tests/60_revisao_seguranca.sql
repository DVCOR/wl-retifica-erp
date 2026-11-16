-- Revisão de segurança: link público só para dono/balcão, orçamento enviado
-- imutável (subtotal, observações) e resposta recusada com OS cancelada.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_token uuid;
  v_serv uuid;
  v_orc uuid;
  v_ret public.os;
begin
  select id, token_publico into v_os, v_token from public.os where empresa_id = v_alfa;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'BLO-RET';

  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc;
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario)
    values (v_alfa, v_orc, 'servico', v_serv, 'Retificar cilindro', 4, 100);

  -- rascunho: subtotal só pelos itens
  perform tests.erro(format('update public.orcamentos set subtotal = 1 where id = %L', v_orc),
    'subtotal não é editável nem no rascunho', 'subtotal');
  perform public.enviar_orcamento(v_orc);

  -- ---------------------------------------------------------- 1. token público
  -- técnico e financeiro não leem o token (nem pela tabela, nem por função)
  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format('select token_publico from public.os where id = %L', v_os),
    'técnico não lê o token público', 'permission denied');
  perform tests.erro('select * from public.os', 'select * em os sem o token falha', 'permission denied');
  perform tests.ok(tests.contar(format('select id, numero, status from public.os where id = %L', v_os)) = 1,
    'técnico continua lendo as demais colunas da OS');
  perform tests.erro(format('select public.os_link_publico(%L)', v_os), 'técnico não pega o link', 'não encontrada');

  perform tests.logar('a_financeiro@t.local');
  perform tests.erro(format('select token_publico from public.os where id = %L', v_os),
    'financeiro não lê o token público', 'permission denied');
  perform tests.erro(format('select public.os_link_publico(%L)', v_os), 'financeiro não pega o link', 'não encontrada');

  -- dono/balcão pegam o link pela função; outra empresa não
  perform tests.logar('a_balcao@t.local');
  v_token := public.os_link_publico(v_os);
  perform tests.ok(v_token is not null, 'balcão pega o link público');
  perform tests.logar('b_dono@t.local');
  perform tests.erro(format('select public.os_link_publico(%L)', v_os), 'outra empresa não pega o link', 'não encontrada');
  perform tests.anonimo();
  perform tests.erro(format('select public.os_link_publico(%L)', v_os), 'anon não executa', 'permission denied');

  -- alterar_status_os devolve a OS sem o token para o técnico
  perform tests.logar('a_dono@t.local');
  update public.os set tecnico_id = tests.membro('a_tecnico@t.local', 'alfa') where id = v_os;
  perform tests.logar('a_tecnico@t.local');
  v_ret := public.alterar_status_os(v_os, 'em_analise');
  perform tests.ok(v_ret.status = 'em_analise' and v_ret.token_publico is null,
    'alterar_status_os não devolve o token ao técnico');
  perform tests.logar('a_balcao@t.local');
  v_ret := public.alterar_status_os(v_os, 'em_analise');
  perform tests.ok(v_ret.token_publico = v_token, 'balcão recebe o token');

  -- criar_os e resumo_cliente continuam funcionando sem SELECT no token
  v_ret := public.criar_os(v_alfa, (select cliente_id from public.os where id = v_os));
  perform tests.ok(v_ret.id is not null and v_ret.status = 'em_recebimento', 'balcão cria OS');
  perform tests.ok((select os_12_meses from public.resumo_cliente((select cliente_id from public.os where id = v_os))) >= 1,
    'resumo do cliente funciona');
  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format('select public.criar_os(%L, %L)', v_alfa, v_ret.cliente_id),
    'técnico não cria OS', 'permissão');

  -- ---------------------------------------------------------- 2. orçamento enviado imutável
  perform tests.logar('a_balcao@t.local');
  -- volta para orcamento_enviado (já há versão enviada)
  perform public.alterar_status_os(v_os, 'orcamento_enviado');
  perform tests.erro(format('update public.orcamentos set subtotal = 99999 where id = %L', v_orc),
    'balcão não altera o subtotal do orçamento enviado', 'subtotal');
  perform tests.erro(format('update public.orcamentos set observacoes = ''outra coisa'' where id = %L', v_orc),
    'observações do orçamento enviado são imutáveis', 'nova versão');
  perform tests.ok((select total from public.orcamentos where id = v_orc) = 400, 'total intacto');

  -- ---------------------------------------------------------- 3. OS cancelada não aceita resposta
  perform tests.logar('a_dono@t.local');
  perform public.alterar_status_os(v_os, 'cancelado', 'Cliente desistiu');
  perform tests.anonimo();
  perform tests.erro(format('select public.responder_orcamento_publico(%L, true, ''Fulano'')', v_token),
    'link não aprova orçamento de OS cancelada', 'não aceita');
  perform tests.logar('a_balcao@t.local');
  perform tests.erro(format('select public.responder_orcamento(%L, true, ''Fulano'')', v_orc),
    'balcão não registra aprovação de OS cancelada', 'não aceita');
  perform tests.logar('a_dono@t.local');
  perform tests.ok((select orcamento_aprovado_id from public.os where id = v_os) is null, 'OS cancelada sem aprovação');
  perform tests.ok((select status from public.orcamentos where id = v_orc) = 'enviado', 'orçamento segue sem resposta');
end;
$$;

-- Aprovação pelo link continua funcionando com a OS em orcamento_enviado.
do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_beta uuid := tests.empresa('beta');
  v_os uuid;
  v_os_beta uuid;
  v_token uuid;
  v_token_beta uuid;
  v_serv uuid;
  v_orc uuid;
begin
  perform tests.deslogar();
  select id into v_os from public.os where empresa_id = v_alfa and status = 'em_recebimento' order by created_at desc limit 1;
  select id, token_publico into v_os_beta, v_token_beta from public.os where empresa_id = v_beta;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'BLO-RET';

  -- OS em recebimento com orçamento enviado: o link não responde
  perform tests.logar('a_balcao@t.local');
  v_token := public.os_link_publico(v_os);
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc;
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario)
    values (v_alfa, v_orc, 'servico', v_serv, 'Retificar cilindro', 1, 100);
  perform public.enviar_orcamento(v_orc);
  perform tests.anonimo();
  perform tests.erro(format('select public.responder_orcamento_publico(%L, true, ''Fulano'')', v_token),
    'OS em recebimento não aceita resposta pelo link', 'não aceita');

  -- recebida e em orcamento_enviado: aprova; segunda resposta é recusada
  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);
  perform public.alterar_status_os(v_os, 'orcamento_enviado');
  perform tests.anonimo();
  perform public.responder_orcamento_publico(v_token, true, 'Fulano');
  perform tests.erro(format('select public.responder_orcamento_publico(%L, false, ''Fulano'')', v_token),
    'não responde duas vezes', 'aguardando resposta');
  -- token de outra empresa não responde o orçamento desta OS
  perform tests.erro(format('select public.responder_orcamento_publico(%L, true, ''Fulano'')', v_token_beta),
    'token da beta não tem orçamento', 'aguardando');
  perform tests.logar('a_dono@t.local');
  perform tests.ok((select status from public.os where id = v_os) = 'aprovado', 'OS aprovada pelo link');
end;
$$;
