-- listar_clientes / listar_motores (busca sem acento) e resumo_cliente.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_beta uuid := tests.empresa('beta');
  v_cli uuid;
  v_cli2 uuid;
  v_cli_beta uuid;
  v_mot uuid;
  v_mot2 uuid;
  v_os uuid;
  v_os2 public.os;
  v_orc uuid;
  v_r record;
begin
  select id into v_cli from public.clientes where empresa_id = v_alfa;
  select id into v_cli_beta from public.clientes where empresa_id = v_beta;
  select id into v_mot from public.motores where empresa_id = v_alfa;
  select id into v_os from public.os where empresa_id = v_alfa;

  perform tests.logar('a_balcao@t.local');
  insert into public.clientes (empresa_id, tipo, nome, nome_fantasia, telefone_whatsapp)
    values (v_alfa, 'final', 'José Antônio Conceição', 'Zé Mecânica', '(19) 99123-4567') returning id into v_cli2;
  insert into public.clientes (empresa_id, tipo, nome, ativo) values (v_alfa, 'final', 'Inativo da Silva', false);
  insert into public.motores (empresa_id, cliente_id, marca, modelo, codigo_motor, numero_serie, veiculo_placa, veiculo_modelo)
    values (v_alfa, v_cli2, 'Fiat', 'Fire Évo', 'EVO14', 'SER-777', 'XYZ9K88', 'Uno') returning id into v_mot2;

  -- ------------------------------------------------------------ listar_clientes
  perform tests.ok((select count(*) from public.listar_clientes(v_alfa)) = 3, 'sem filtro lista todos');
  perform tests.ok((select max(total) from public.listar_clientes(v_alfa)) = 3, 'total sem filtro');
  perform tests.ok((select max(total) from public.listar_clientes(v_alfa, null, null, null, 1, 0)) = 3
    and (select count(*) from public.listar_clientes(v_alfa, null, null, null, 1, 0)) = 1, 'paginação mantém total');
  perform tests.ok((select id from public.listar_clientes(v_alfa, 'jose antonio')) = v_cli2, 'busca sem acento');
  perform tests.ok((select id from public.listar_clientes(v_alfa, 'CONCEIÇÃO')) = v_cli2, 'busca com acento e maiúscula');
  perform tests.ok((select id from public.listar_clientes(v_alfa, 'ze mecan')) = v_cli2, 'busca pela fantasia');
  perform tests.ok((select id from public.listar_clientes(v_alfa, '91234')) = v_cli2, 'busca por trecho do telefone');
  perform tests.ok((select id from public.listar_clientes(v_alfa, '11.222.333')) = v_cli, 'busca por documento formatado');
  perform tests.ok((select id from public.listar_clientes(v_alfa, 'xyz-9k')) = v_cli2, 'busca pela placa do motor');
  perform tests.ok((select id from public.listar_clientes(v_alfa, 'qwe1a')) = v_cli, 'busca pela placa da OS (lojista)');
  perform tests.ok((select count(*) from public.listar_clientes(v_alfa, null, 'lojista')) = 1, 'filtro por tipo');
  perform tests.ok((select count(*) from public.listar_clientes(v_alfa, null, null, false)) = 1, 'filtro inativos');
  perform tests.ok((select count(*) from public.listar_clientes(v_alfa, 'cliente do beta')) = 0, 'não vê outra empresa');
  perform tests.ok((select count(*) from public.listar_clientes(v_beta)) = 0, 'empresa alheia: nada (RLS)');
  perform tests.ok((select os_em_andamento from public.listar_clientes(v_alfa) where id = v_cli) = 0,
    'OS em recebimento não conta como andamento');

  -- ------------------------------------------------------------ listar_motores
  perform tests.ok((select count(*) from public.listar_motores(v_alfa)) = 2, 'lista motores');
  perform tests.ok((select id from public.listar_motores(v_alfa, 'fire evo')) = v_mot2, 'motor sem acento');
  perform tests.ok((select id from public.listar_motores(v_alfa, 'xyz9')) = v_mot2, 'motor por trecho de placa');
  perform tests.ok((select id from public.listar_motores(v_alfa, 'ser777')) = v_mot2, 'motor por série sem hífen');
  perform tests.ok((select id from public.listar_motores(v_alfa, 'conceicao')) = v_mot2, 'motor pelo nome do cliente');
  perform tests.ok((select cliente_nome from public.listar_motores(v_alfa, 'uno')) = 'José Antônio Conceição',
    'devolve o nome do cliente');
  perform tests.ok((select count(*) from public.listar_motores(v_alfa, null, v_cli)) = 1
    and (select id from public.listar_motores(v_alfa, null, v_cli)) = v_mot, 'sem termo: só os do cliente');
  perform tests.ok((select id from public.listar_motores(v_alfa, '', v_cli2, 1, 0)) = v_mot2, 'termo vazio = sem termo');
  perform tests.ok((select count(*) from public.listar_motores(v_beta)) = 0, 'motores de outra empresa: nada');

  -- ------------------------------------------------------------ resumo_cliente
  select * into v_r from public.resumo_cliente(v_cli);
  perform tests.ok(v_r.os_em_andamento = 0 and v_r.os_12_meses = 0, 'OS em recebimento é ignorada');
  perform tests.ok(v_r.em_aberto = 0, 'balcão vê em aberto (zero)');

  perform tests.receber_os(v_os);
  -- orçamento aprovado → em aberto
  perform tests.logar('a_dono@t.local');
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc;
  insert into public.orcamento_itens (empresa_id, orcamento_id, tipo, descricao, quantidade, preco_unitario)
    values (v_alfa, v_orc, 'servico', 'Retífica', 1, 500);
  perform public.alterar_status_os(v_os, 'em_analise');
  perform public.enviar_orcamento(v_orc);
  perform public.responder_orcamento(v_orc, true, 'Cliente', 'presencial');

  select * into v_r from public.resumo_cliente(v_cli);
  perform tests.ok(v_r.os_em_andamento = 1 and v_r.os_12_meses = 1, 'OS aprovada conta');
  perform tests.ok(v_r.em_aberto = 500, 'em aberto soma o orçamento aprovado');
  perform tests.ok(v_r.motores_em_garantia = 0, 'sem garantia ainda');
  perform tests.ok((select os_em_andamento from public.listar_clientes(v_alfa) where id = v_cli) = 1,
    'listagem conta OS em andamento');

  -- garantia: OS entregue com garantia vigente
  perform tests.deslogar();
  perform set_config('app.alterando_status', 'on', true);
  update public.os set status = 'entregue', garantia_ate = current_date + 30 where id = v_os;
  perform set_config('app.alterando_status', '', true);
  perform tests.logar('a_dono@t.local');
  select * into v_r from public.resumo_cliente(v_cli);
  perform tests.ok(v_r.motores_em_garantia = 1 and v_r.os_em_andamento = 0, 'motor em garantia');

  perform tests.logar('a_tecnico@t.local');
  select * into v_r from public.resumo_cliente(v_cli);
  perform tests.ok(v_r.em_aberto is null and v_r.os_12_meses = 1, 'técnico não vê valor em aberto');

  perform tests.logar('b_dono@t.local');
  perform tests.ok((select count(*) from public.resumo_cliente(v_cli)) = 0, 'outra empresa não resume cliente alheio');
end;
$$;
