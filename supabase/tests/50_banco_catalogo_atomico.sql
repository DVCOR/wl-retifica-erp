-- Catálogo atômico: salvar_kit, salvar_precos_tabela, definir_tabela_padrao.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_beta uuid := tests.empresa('beta');
  v_s1 uuid;
  v_s2 uuid;
  v_s_beta uuid;
  v_peca uuid;
  v_kit uuid;
  v_tab uuid;
  v_tab_lojista uuid;
  v_tab_beta uuid;
  v_n integer;
begin
  select id into v_s1 from public.servicos where empresa_id = v_alfa and codigo = 'CAB-FACE';
  select id into v_s2 from public.servicos where empresa_id = v_alfa and codigo = 'CAB-LAV';
  select id into v_s_beta from public.servicos where empresa_id = v_beta limit 1;
  select id into v_tab_lojista from public.tabelas_preco where empresa_id = v_alfa and padrao_para = 'lojista';
  select id into v_tab_beta from public.tabelas_preco where empresa_id = v_beta limit 1;

  perform tests.logar('a_dono@t.local');
  insert into public.pecas (empresa_id, descricao, preco_venda) values (v_alfa, 'Junta', 50) returning id into v_peca;

  -- ------------------------------------------------------------ salvar_kit
  v_kit := public.salvar_kit(null, jsonb_build_object('empresa_id', v_alfa, 'nome', ' Kit teste ', 'descricao', ''),
    jsonb_build_array(jsonb_build_object('tipo', 'servico', 'id', v_s1, 'quantidade', 1),
                      jsonb_build_object('tipo', 'peca', 'id', v_peca, 'quantidade', 8)));
  perform tests.ok((select nome from public.kits where id = v_kit) = 'Kit teste', 'kit criado com nome aparado');
  perform tests.ok((select descricao from public.kits where id = v_kit) is null, 'descrição vazia vira null');
  perform tests.ok((select count(*) from public.kit_itens where kit_id = v_kit) = 2, 'kit com 2 itens');
  perform tests.ok((select ordem from public.kit_itens where kit_id = v_kit and peca_id = v_peca) = 1, 'ordem pela posição');

  perform public.salvar_kit(v_kit, jsonb_build_object('nome', 'Kit editado'),
    jsonb_build_array(jsonb_build_object('tipo', 'servico', 'id', v_s2, 'quantidade', 2)));
  perform tests.ok((select nome from public.kits where id = v_kit) = 'Kit editado', 'kit renomeado');
  perform tests.ok((select count(*) from public.kit_itens where kit_id = v_kit) = 1
    and (select servico_id from public.kit_itens where kit_id = v_kit) = v_s2, 'itens substituídos');

  -- falha no meio não deixa o kit pela metade (item de outra empresa)
  perform tests.erro(format('select public.salvar_kit(%L, %L::jsonb, %L::jsonb)', v_kit,
    jsonb_build_object('nome', 'Quebrado'),
    jsonb_build_array(jsonb_build_object('tipo', 'servico', 'id', v_s1, 'quantidade', 1),
                      jsonb_build_object('tipo', 'servico', 'id', v_s_beta, 'quantidade', 1))),
    'kit não aceita serviço de outra empresa');
  perform tests.ok((select nome from public.kits where id = v_kit) = 'Kit editado'
    and (select count(*) from public.kit_itens where kit_id = v_kit) = 1, 'erro desfaz tudo (atômico)');
  perform tests.erro(format('select public.salvar_kit(%L, %L::jsonb, ''[]''::jsonb)', v_kit,
    jsonb_build_object('nome', 'X')), 'kit vazio é recusado', 'ao menos um item');
  perform tests.erro(format('select public.salvar_kit(%L, %L::jsonb, %L::jsonb)', v_kit,
    jsonb_build_object('nome', 'X'),
    jsonb_build_array(jsonb_build_object('tipo', 'servico', 'id', v_s1, 'quantidade', 1),
                      jsonb_build_object('tipo', 'servico', 'id', v_s1, 'quantidade', 2))),
    'item repetido é recusado', 'repetidos');
  perform tests.erro(format('select public.salvar_kit(%L, %L::jsonb, %L::jsonb)', v_kit,
    jsonb_build_object('nome', 'X'),
    jsonb_build_array(jsonb_build_object('tipo', 'servico', 'id', v_s1, 'quantidade', 0))),
    'quantidade zero é recusada');
  perform tests.erro(format('select public.salvar_kit(null, %L::jsonb, %L::jsonb)',
    jsonb_build_object('empresa_id', v_beta, 'nome', 'Invasor'),
    jsonb_build_array(jsonb_build_object('tipo', 'servico', 'id', v_s_beta, 'quantidade', 1))),
    'dono da alfa não cria kit na beta', 'só o dono');

  -- ------------------------------------------------------------ salvar_precos_tabela
  insert into public.tabelas_preco (empresa_id, nome) values (v_alfa, 'Parceiros') returning id into v_tab;
  v_n := public.salvar_precos_tabela(v_tab, jsonb_build_array(
    jsonb_build_object('tipo', 'servico', 'id', v_s1, 'preco', 150),
    jsonb_build_object('tipo', 'peca', 'id', v_peca, 'preco', 40)));
  perform tests.ok(v_n = 2, 'dois preços gravados');
  v_n := public.salvar_precos_tabela(v_tab, jsonb_build_array(
    jsonb_build_object('tipo', 'servico', 'id', v_s1, 'preco', 160),
    jsonb_build_object('tipo', 'peca', 'id', v_peca, 'preco', null),
    jsonb_build_object('tipo', 'servico', 'id', v_s2, 'preco', null)));
  perform tests.ok(v_n = 2, 'um atualizado + um removido (remover inexistente não conta)');
  perform tests.ok((select preco from public.tabela_preco_itens where tabela_preco_id = v_tab and servico_id = v_s1) = 160,
    'preço atualizado');
  perform tests.ok(not exists (select 1 from public.tabela_preco_itens where tabela_preco_id = v_tab and peca_id = v_peca),
    'preço removido');
  perform tests.erro(format('select public.salvar_precos_tabela(%L, %L::jsonb)', v_tab, jsonb_build_array(
    jsonb_build_object('tipo', 'servico', 'id', v_s2, 'preco', 10),
    jsonb_build_object('tipo', 'servico', 'id', v_s1, 'preco', -1))), 'preço negativo é recusado');
  perform tests.ok(not exists (select 1 from public.tabela_preco_itens where tabela_preco_id = v_tab and servico_id = v_s2),
    'erro desfaz o lote inteiro');
  perform tests.erro(format('select public.salvar_precos_tabela(%L, %L::jsonb)', v_tab, jsonb_build_array(
    jsonb_build_object('tipo', 'servico', 'id', v_s_beta, 'preco', 10))), 'serviço de outra empresa é recusado');
  perform tests.erro(format('select public.salvar_precos_tabela(%L, ''[]''::jsonb)', v_tab_beta),
    'tabela de outra empresa não é encontrada', 'não encontrada');

  -- ------------------------------------------------------------ definir_tabela_padrao
  perform public.definir_tabela_padrao(v_tab, 'lojista');
  perform tests.ok((select padrao_para from public.tabelas_preco where id = v_tab) = 'lojista', 'nova padrão lojista');
  perform tests.ok((select padrao_para from public.tabelas_preco where id = v_tab_lojista) is null, 'anterior liberada');
  perform public.definir_tabela_padrao(v_tab, 'lojista');
  perform tests.ok((select count(*) from public.tabelas_preco where empresa_id = v_alfa and padrao_para = 'lojista') = 1,
    'idempotente');
  perform public.definir_tabela_padrao(v_tab, null);
  perform tests.ok((select padrao_para from public.tabelas_preco where id = v_tab) is null, 'deixa de ser padrão');
  update public.tabelas_preco set ativo = false where id = v_tab;
  perform tests.erro(format('select public.definir_tabela_padrao(%L, ''final'')', v_tab),
    'tabela inativa não vira padrão', 'Ative');

  -- ------------------------------------------------------------ outros papéis
  perform tests.logar('a_balcao@t.local');
  perform tests.erro(format('select public.salvar_kit(%L, %L::jsonb, %L::jsonb)', v_kit,
    jsonb_build_object('nome', 'Balcão'),
    jsonb_build_array(jsonb_build_object('tipo', 'servico', 'id', v_s1, 'quantidade', 1))),
    'balcão não salva kit', 'só o dono');
  perform tests.erro(format('select public.salvar_precos_tabela(%L, ''[]''::jsonb)', v_tab_lojista),
    'balcão não salva preços', 'só o dono');
  perform tests.erro(format('select public.definir_tabela_padrao(%L, ''lojista'')', v_tab_lojista),
    'balcão não define padrão', 'só o dono');

  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format('select public.salvar_precos_tabela(%L, ''[]''::jsonb)', v_tab_lojista),
    'técnico nem enxerga a tabela', 'não encontrada');

  perform tests.anonimo();
  perform tests.erro(format('select public.definir_tabela_padrao(%L, ''lojista'')', v_tab_lojista),
    'anônimo não executa', 'permission denied');
end;
$$;
