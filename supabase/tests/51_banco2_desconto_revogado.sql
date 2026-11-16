-- Aprovação de desconto do dono é revogada quando o desconto muda depois.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_serv uuid;
  v_orc uuid;
  v_item uuid;
  v_dono uuid := tests.membro('a_dono@t.local', 'alfa');
begin
  select id into v_os from public.os where empresa_id = v_alfa;
  select id into v_serv from public.servicos where empresa_id = v_alfa and codigo = 'BLO-RET';

  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc;
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, servico_id, descricao, quantidade, preco_unitario)
    values (v_alfa, v_orc, 'servico', v_serv, 'Retificar cilindro', 4, 100) returning id into v_item;
  update public.orcamentos set desconto = 100 where id = v_orc;

  -- dono aprova; dono mexe no desconto: aprovação continua
  perform tests.logar('a_dono@t.local');
  update public.orcamentos set desconto_aprovado_por = v_dono where id = v_orc;
  update public.orcamentos set desconto = 120 where id = v_orc;
  update public.orcamento_itens set desconto = 10 where id = v_item;
  perform tests.ok((select desconto_aprovado_por from public.orcamentos where id = v_orc) = v_dono,
    'alteração do dono mantém a aprovação');

  -- balcão muda o desconto do orçamento: revoga
  perform tests.logar('a_balcao@t.local');
  update public.orcamentos set observacoes = 'x' where id = v_orc;
  perform tests.ok((select desconto_aprovado_por from public.orcamentos where id = v_orc) = v_dono,
    'outra alteração não revoga');
  update public.orcamentos set desconto = 150 where id = v_orc;
  perform tests.ok((select desconto_aprovado_por from public.orcamentos where id = v_orc) is null,
    'desconto do orçamento mudou: aprovação revogada');
  perform tests.erro(format('select public.enviar_orcamento(%L)', v_orc), 'sem aprovação não envia', 'limite');

  -- balcão muda desconto de item: revoga
  perform tests.logar('a_dono@t.local');
  update public.orcamentos set desconto_aprovado_por = v_dono where id = v_orc;
  perform tests.logar('a_balcao@t.local');
  update public.orcamento_itens set quantidade = 4 where id = v_item;
  perform tests.ok((select desconto_aprovado_por from public.orcamentos where id = v_orc) = v_dono,
    'item sem mudança de desconto não revoga');
  update public.orcamento_itens set desconto = 20 where id = v_item;
  perform tests.ok((select desconto_aprovado_por from public.orcamentos where id = v_orc) is null,
    'desconto do item mudou: aprovação revogada');

  -- item novo com desconto também revoga
  perform tests.logar('a_dono@t.local');
  update public.orcamentos set desconto_aprovado_por = v_dono where id = v_orc;
  perform tests.logar('a_balcao@t.local');
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, descricao, quantidade, preco_unitario, desconto)
    values (v_alfa, v_orc, 'peca', 'Junta', 1, 50, 5);
  perform tests.ok((select desconto_aprovado_por from public.orcamentos where id = v_orc) is null,
    'item novo com desconto revoga a aprovação');
  perform tests.deslogar();
end;
$$;
