-- Página pública por token, fluxo de orçamento (envio, versões, desconto, resposta).
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_token uuid;
  v_serv uuid;
  v_orc1 uuid;
  v_orc2 uuid;
  v_pub jsonb;
  v_novo_token uuid;
begin
  select id, token_publico into v_os, v_token from public.os where empresa_id = v_alfa;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'BLO-RET';

  -- OS ainda em recebimento não aparece no link
  perform tests.anonimo();
  perform tests.ok(public.os_publica(v_token) is null, 'OS em recebimento não é pública');
  perform tests.ok(public.os_publica(gen_random_uuid()) is null, 'token inexistente = null');

  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);

  -- orçamento v1 com desconto acima do limite do balcão (10%)
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc1;
  perform tests.erro(format('select public.enviar_orcamento(%L)', v_orc1), 'orçamento vazio não é enviado', '1 item');
  -- BLO-RET é por cilindro: quantidade sugerida = 4 cilindros
  perform tests.ok(public.quantidade_sugerida(v_serv, (select motor_id from public.os where id = v_os)) = 4,
    'quantidade por cilindro');
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario, desconto)
    values (v_alfa, v_orc1, 'servico', v_serv, 'Retificar cilindro', 4, 100, 0);
  update public.orcamentos set desconto = 100 where id = v_orc1;   -- 25%
  perform tests.ok((select total from public.orcamentos where id = v_orc1) = 300, 'total = subtotal - desconto');
  perform tests.erro(format('select public.enviar_orcamento(%L)', v_orc1), 'desconto acima do limite', 'limite');
  perform tests.erro(format('update public.orcamentos set desconto_aprovado_por = %L where id = %L',
    tests.membro('a_balcao@t.local', 'alfa'), v_orc1), 'balcão não aprova o próprio desconto', 'dono');
  perform tests.erro(format('update public.orcamentos set status = ''enviado'' where id = %L', v_orc1),
    'status do orçamento só por função', 'enviar_orcamento');

  perform tests.logar('a_dono@t.local');
  update public.orcamentos set desconto_aprovado_por = public.membro_atual(v_alfa) where id = v_orc1;

  perform tests.logar('a_balcao@t.local');
  perform public.enviar_orcamento(v_orc1);
  perform tests.ok((select status from public.os where id = v_os) = 'orcamento_enviado', 'OS foi para orcamento_enviado');
  perform tests.erro(format(
    'insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, descricao, preco_unitario) values (%L, %L, ''peca'', ''x'', 1)',
    v_alfa, v_orc1), 'orçamento enviado é imutável', 'nova versão');

  -- nova versão substitui a anterior
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc2;
  perform tests.ok((select versao from public.orcamentos where id = v_orc2) = 2, 'versão 2');
  perform tests.ok((select status from public.orcamentos where id = v_orc1) = 'substituido', 'v1 substituída');
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario)
    values (v_alfa, v_orc2, 'servico', v_serv, 'Retificar cilindro', 4, 100);
  perform public.enviar_orcamento(v_orc2);

  -- página pública: campos necessários e nada sensível
  perform tests.anonimo();
  v_pub := public.os_publica(v_token);
  perform tests.ok(v_pub -> 'os' ->> 'status' = 'orcamento_enviado', 'status na página pública');
  perform tests.ok((v_pub -> 'orcamento' ->> 'versao')::int = 2, 'mostra a versão vigente');
  perform tests.ok((v_pub -> 'orcamento' ->> 'total')::numeric = 400, 'total da versão vigente');
  perform tests.ok(jsonb_array_length(v_pub -> 'orcamento' -> 'itens') = 1, 'itens do orçamento');
  perform tests.ok((v_pub ->> 'qtd_fotos')::int = 3, 'quantidade de fotos');
  perform tests.erro(format('select * from public.os_publica_fotos(%L)', v_token),
    'anon não lê caminhos das fotos', 'permission denied');
  perform tests.ok(v_pub::text not like '%11222333000181%' and v_pub::text not like '%988881111%',
    'não expõe documento nem telefone do cliente');
  perform tests.ok(v_pub::text not like '%' || v_os::text || '%' and v_pub::text not like '%' || v_alfa::text || '%',
    'não expõe ids internos');

  perform tests.erro(format('select public.responder_orcamento_publico(%L, true, ''A'')', v_token),
    'nome obrigatório', 'nome');
  perform tests.erro(format('select public.responder_orcamento_publico(%L, true, ''Fulano'')', gen_random_uuid()),
    'token inválido', 'inválido');
  v_pub := public.responder_orcamento_publico(v_token, true, 'Fulano de Tal', '200.100.50.25', 'Teste/1.0');
  perform tests.ok(v_pub -> 'os' ->> 'status' = 'aprovado', 'cliente aprovou pelo link');
  perform tests.erro(format('select public.responder_orcamento_publico(%L, false, ''Fulano'')', v_token),
    'não responde duas vezes', 'aguardando');

  perform tests.logar('a_balcao@t.local');
  perform tests.ok((select status from public.orcamentos where id = v_orc2) = 'aprovado', 'orçamento aprovado');
  perform tests.ok((select respondido_ip from public.orcamentos where id = v_orc2) = '200.100.50.25', 'IP gravado');
  perform tests.ok((select respondido_por_nome from public.orcamentos where id = v_orc2) = 'Fulano de Tal', 'nome gravado');
  perform tests.ok((select canal from public.orcamentos where id = v_orc2) = 'link', 'canal = link');
  perform tests.ok((select orcamento_aprovado_id from public.os where id = v_os) = v_orc2, 'OS aponta a versão aprovada');
  perform tests.ok(exists (select 1 from public.os_assinaturas where os_id = v_os and tipo = 'aprovacao'
                             and nome = 'Fulano de Tal' and ip = '200.100.50.25'), 'assinatura de aprovação');
  perform tests.ok(exists (select 1 from public.os_status_historico where os_id = v_os and status_para = 'aprovado'
                             and membro_id is null and motivo like '%Fulano de Tal%'), 'histórico da aprovação pelo cliente');
  perform tests.erro(format('update public.os set orcamento_aprovado_id = null where id = %L', v_os),
    'orcamento_aprovado_id só pelo fluxo', 'controlados');

  -- revogar link
  v_novo_token := public.regenerar_token_publico(v_os);
  perform tests.anonimo();
  perform tests.ok(public.os_publica(v_token) is null, 'token antigo revogado');
  perform tests.ok(public.os_publica(v_novo_token) is not null, 'token novo funciona');
  perform tests.deslogar();
  set local role service_role;
  perform tests.ok((select count(*) from public.os_publica_fotos(v_novo_token)) = 3, 'service_role lê os caminhos');
  reset role;

  -- entrega exige assinatura e inicia a garantia
  perform tests.logar('a_dono@t.local');
  perform public.alterar_status_os(v_os, 'em_execucao');
  perform public.alterar_status_os(v_os, 'pronto');
  perform tests.logar('a_financeiro@t.local');
  perform tests.erro(format('select public.alterar_status_os(%L, ''entregue'')', v_os), 'entrega exige assinatura', 'assinatura');
  insert into public.os_assinaturas (empresa_id, os_id, tipo, nome) values (v_alfa, v_os, 'entrega', 'Fulano de Tal');
  perform public.alterar_status_os(v_os, 'entregue');
  perform tests.ok((select garantia_ate from public.os where id = v_os)
                   = (now() at time zone 'America/Sao_Paulo')::date + 90, 'garantia até = entrega + 90 dias');

  -- balcão registra resposta verbal em outra OS: reprovação
  perform tests.deslogar();
end;
$$;
