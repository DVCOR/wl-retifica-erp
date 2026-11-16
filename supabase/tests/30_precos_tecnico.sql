-- Técnico não vê preços (a não ser que a empresa ligue config.tecnico_ve_precos).
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_cli uuid;
  v_serv uuid;
  v_orc uuid;
begin
  select id, cliente_id into v_os, v_cli from public.os where empresa_id = v_alfa;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'CAB-FACE';

  -- balcão cria um orçamento em rascunho
  perform tests.logar('a_balcao@t.local');
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc;
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade)
    values (v_alfa, v_orc, 'servico', v_serv, 'Plainar face', 1);

  perform tests.logar('a_tecnico@t.local');
  perform tests.ok(tests.contar('select 1 from public.servicos') = 0, 'técnico não lê servicos (tem preço)');
  perform tests.ok(tests.contar('select 1 from public.pecas') = 0, 'técnico não lê pecas');
  perform tests.ok(tests.contar('select 1 from public.tabelas_preco') = 0, 'técnico não lê tabelas de preço');
  perform tests.ok(tests.contar('select 1 from public.tabela_preco_itens') = 0, 'técnico não lê itens de tabela');
  perform tests.ok(tests.contar('select 1 from public.orcamentos') = 0, 'técnico não lê orçamentos');
  perform tests.ok(tests.contar('select 1 from public.orcamento_itens') = 0, 'técnico não lê itens com preço');
  perform tests.ok(public.preco_sugerido(v_alfa, v_cli, v_serv) is null, 'preco_sugerido devolve null ao técnico');

  -- views sem preço
  perform tests.ok(tests.contar('select 1 from public.v_servicos_catalogo') = 20, 'técnico lê catálogo pela view');
  perform tests.ok(tests.contar(format(
    'select 1 from public.v_orcamento_itens_sem_preco where os_id = %L', v_os)) = 1, 'técnico vê itens sem preço');
  perform tests.ok(not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('v_servicos_catalogo', 'v_pecas_catalogo', 'v_orcamento_itens_sem_preco')
      and (column_name like '%preco%' or column_name in ('custo', 'total', 'desconto', 'subtotal'))
  ), 'views não têm colunas de preço');
  perform tests.ok(tests.contar('select 1 from public.kits') = 1, 'técnico vê kits (sem preço)');

  -- técnico sugere item: preço vem da tabela do cliente, não do técnico
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario, desconto)
    values (v_alfa, v_orc, 'servico', v_serv, 'Sugestão do técnico', 1, 1.00, 0);
  perform tests.ok(tests.linhas(format('update public.orcamento_itens set quantidade = 3 where orcamento_id = %L', v_orc)) = 0,
    'técnico não edita itens');

  perform tests.logar('a_dono@t.local');
  -- cliente é lojista: tabela "Lojista" 15% sobre preco_base 180 = 153
  perform tests.ok((select preco_unitario from public.orcamento_itens
                     where orcamento_id = v_orc and descricao = 'Sugestão do técnico') = 153.00,
    'preço do item sugerido veio da tabela do lojista');
  perform tests.ok((select sugerido_por from public.orcamento_itens
                     where orcamento_id = v_orc and descricao = 'Sugestão do técnico')
                   = tests.membro('a_tecnico@t.local', 'alfa'), 'sugerido_por = técnico');
  perform tests.ok((select subtotal from public.orcamentos where id = v_orc) = 306.00, 'subtotal recalculado');
  perform tests.ok(public.preco_sugerido(v_alfa, v_cli, v_serv) = 153.00, 'preco_sugerido para o dono');

  -- dono liga a configuração: técnico passa a ver preços
  update public.empresas set config = config || '{"tecnico_ve_precos": true}' where id = v_alfa;
  perform tests.logar('a_tecnico@t.local');
  perform tests.ok(tests.contar('select 1 from public.servicos') = 20, 'com config ligada o técnico vê preços');
  perform tests.ok(tests.contar('select 1 from public.orcamentos') = 1, 'com config ligada o técnico vê orçamento');
  perform tests.ok(tests.linhas('update public.servicos set preco_base = 1') = 0, 'mesmo vendo, técnico não altera preço');
  perform tests.deslogar();
end;
$$;
