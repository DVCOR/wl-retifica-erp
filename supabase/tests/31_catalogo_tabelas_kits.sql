-- Catálogo: tabelas de preço, preços específicos e kits (regras usadas pelo módulo Catálogo).
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_beta uuid := tests.empresa('beta');
  v_cli uuid;
  v_serv uuid;
  v_serv_beta uuid;
  v_peca uuid;
  v_tabela uuid;
  v_tabela2 uuid;
  v_kit uuid;
begin
  select id into v_cli from public.clientes where empresa_id = v_alfa and tipo = 'lojista' limit 1;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'CAB-FACE';
  select id into v_serv_beta from public.servicos where empresa_id = v_beta limit 1;

  -- ----------------------------------------------------------------- dono
  perform tests.logar('a_dono@t.local');
  insert into public.pecas (empresa_id, descricao, unidade, custo, preco_venda)
    values (v_alfa, 'Junta do cabeçote', 'un', 40, 100) returning id into v_peca;
  update public.servicos set preco_base = 200 where id = v_serv;

  insert into public.tabelas_preco (empresa_id, nome, desconto_padrao_pct, padrao_para)
    values (v_alfa, 'Oficina parceira', 10, null) returning id into v_tabela;
  insert into public.tabelas_preco (empresa_id, nome, desconto_padrao_pct) values (v_alfa, 'Outra', 0)
    returning id into v_tabela2;

  -- a tabela vira a padrão dos clientes lojistas depois de liberar a anterior
  update public.tabelas_preco set padrao_para = null where empresa_id = v_alfa and padrao_para = 'lojista';
  perform tests.ok(tests.linhas(format(
    'update public.tabelas_preco set padrao_para = ''lojista'' where id = %L', v_tabela)) = 1,
    'dono define a tabela padrão após liberar a anterior');
  perform tests.erro(format(
    'update public.tabelas_preco set padrao_para = ''lojista'' where id = %L', v_tabela2),
    'só uma tabela ativa é padrão por tipo de cliente');
  perform tests.erro(format(
    'update public.tabelas_preco set desconto_padrao_pct = 101 where id = %L', v_tabela2),
    'desconto acima de 100% é recusado');

  -- preço do cliente lojista cai na tabela padrão (10% de 200 = 180); preço específico vence
  update public.clientes set tabela_preco_id = null where id = v_cli;
  perform tests.ok(public.preco_sugerido(v_alfa, v_cli, v_serv) = 180, 'preço = base com desconto da tabela');
  insert into public.tabela_preco_itens (empresa_id, tabela_preco_id, servico_id, preco)
    values (v_alfa, v_tabela, v_serv, 150);
  perform tests.ok(public.preco_sugerido(v_alfa, v_cli, v_serv) = 150, 'preço específico vence o desconto');
  perform tests.erro(format(
    'insert into public.tabela_preco_itens (empresa_id, tabela_preco_id, servico_id, preco) values (%L, %L, %L, 1)',
    v_alfa, v_tabela, v_serv), 'não repete o item na mesma tabela');
  perform tests.erro(format(
    'insert into public.tabela_preco_itens (empresa_id, tabela_preco_id, servico_id, peca_id, preco) values (%L, %L, %L, %L, 1)',
    v_alfa, v_tabela, v_serv, v_peca), 'item da tabela é serviço ou peça, nunca os dois');
  perform tests.ok(public.preco_sugerido(v_alfa, v_cli, null, v_peca) = 90, 'peça usa desconto da tabela');

  -- kits
  insert into public.kits (empresa_id, nome, descricao) values (v_alfa, 'Retífica completa de cabeçote 8v', 'teste')
    returning id into v_kit;
  insert into public.kit_itens (empresa_id, kit_id, servico_id, quantidade, ordem) values (v_alfa, v_kit, v_serv, 1, 0);
  insert into public.kit_itens (empresa_id, kit_id, peca_id, quantidade, ordem) values (v_alfa, v_kit, v_peca, 8, 1);
  perform tests.erro(format(
    'insert into public.kit_itens (empresa_id, kit_id, servico_id, quantidade) values (%L, %L, %L, 0)',
    v_alfa, v_kit, v_serv), 'quantidade do kit deve ser positiva');
  perform tests.erro(format(
    'insert into public.kit_itens (empresa_id, kit_id, servico_id, quantidade) values (%L, %L, %L, 1)',
    v_alfa, v_kit, v_serv_beta), 'kit não aceita serviço de outra empresa');
  perform tests.ok(tests.linhas(format('delete from public.kit_itens where kit_id = %L and peca_id = %L', v_kit, v_peca)) = 1,
    'dono troca os itens do kit');

  -- ------------------------------------------------- balcão e financeiro: só leitura
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(tests.contar(format('select 1 from public.tabela_preco_itens where tabela_preco_id = %L', v_tabela)) = 1,
    'balcão vê preços da tabela');
  perform tests.ok(tests.contar(format('select 1 from public.kit_itens where kit_id = %L', v_kit)) = 1, 'balcão vê itens do kit');
  perform tests.erro(format(
    'insert into public.tabela_preco_itens (empresa_id, tabela_preco_id, peca_id, preco) values (%L, %L, %L, 5)',
    v_alfa, v_tabela, v_peca), 'balcão não grava preço de tabela');
  perform tests.ok(tests.linhas(format('update public.tabelas_preco set desconto_padrao_pct = 50 where id = %L', v_tabela)) = 0,
    'balcão não altera tabela');
  perform tests.ok(tests.linhas(format('update public.kits set nome = ''x'' where id = %L', v_kit)) = 0, 'balcão não altera kit');
  perform tests.ok(tests.contar(format('select 1 from public.clientes where tabela_preco_id = %L or tipo = ''lojista''', v_tabela)) >= 1,
    'balcão enxerga clientes para a contagem por tabela');

  perform tests.logar('a_financeiro@t.local');
  perform tests.ok(tests.contar(format('select 1 from public.tabelas_preco where id = %L', v_tabela)) = 1, 'financeiro vê tabelas');
  perform tests.ok(tests.linhas(format('update public.pecas set preco_venda = 1 where id = %L', v_peca)) = 0,
    'financeiro não altera peças');
  perform tests.erro(format('insert into public.kits (empresa_id, nome) values (%L, ''x'')', v_alfa), 'financeiro não cria kit');

  -- --------------------------------------------------------------- técnico
  perform tests.logar('a_tecnico@t.local');
  perform tests.ok(tests.contar('select 1 from public.tabela_preco_itens') = 0, 'técnico não vê preços por tabela');
  perform tests.ok(tests.contar('select 1 from public.pecas') = 0, 'técnico não lê peças (tem preço)');
  perform tests.ok(tests.contar(format('select 1 from public.v_pecas_catalogo where id = %L', v_peca)) = 1,
    'técnico lê peças pela view sem preço');
  perform tests.ok(tests.contar(format('select 1 from public.kit_itens where kit_id = %L', v_kit)) = 1,
    'técnico vê composição do kit (sem preço)');
  perform tests.erro(format('insert into public.kits (empresa_id, nome) values (%L, ''x'')', v_alfa), 'técnico não cria kit');

  -- ------------------------------------------------------- outra empresa
  perform tests.logar('b_dono@t.local');
  perform tests.ok(tests.contar(format('select 1 from public.kits where id = %L', v_kit)) = 0, 'outra empresa não vê o kit');
  perform tests.ok(tests.contar(format('select 1 from public.tabela_preco_itens where tabela_preco_id = %L', v_tabela)) = 0,
    'outra empresa não vê preços da tabela');
end;
$$;
