-- Resposta registrada pelo balcão, kit no orçamento e devolução após reprovação.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_orc uuid;
  v_kit uuid;
  v_qtd integer;
begin
  select id into v_os from public.os where empresa_id = v_alfa;
  select id into v_kit from public.kits where empresa_id = v_alfa;

  perform tests.logar('a_balcao@t.local');
  perform tests.receber_os(v_os);
  insert into public.orcamentos (empresa_id, os_id) values (v_alfa, v_os) returning id into v_orc;
  v_qtd := public.adicionar_kit_orcamento(v_orc, v_kit);
  perform tests.ok(v_qtd = 6, 'kit inseriu 6 itens');
  -- motor 4 cilindros × 2 válvulas: serviços por válvula = 8
  perform tests.ok((select quantidade from public.orcamento_itens i join public.servicos s on s.id = i.servico_id
                     where i.orcamento_id = v_orc and s.codigo = 'CAB-SEDE') = 8, 'quantidade por válvula');
  perform tests.ok((select subtotal from public.orcamentos where id = v_orc) > 0, 'subtotal com preço sugerido');

  perform tests.erro(format('select public.responder_orcamento(%L, true, ''Fulano'', ''whatsapp'')', v_orc),
    'não responde rascunho', 'aguardando');
  perform public.enviar_orcamento(v_orc);

  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format('select public.responder_orcamento(%L, false, ''Fulano'', ''whatsapp'')', v_orc),
    'técnico não registra resposta', 'não encontrado');

  perform tests.logar('a_balcao@t.local');
  perform public.responder_orcamento(v_orc, false, 'Fulano', 'whatsapp');
  perform tests.ok((select status from public.os where id = v_os) = 'reprovado', 'OS reprovada');
  perform tests.ok((select canal from public.orcamentos where id = v_orc) = 'whatsapp', 'canal registrado');

  -- devolução do motor reprovado: exige assinatura de retirada, sem garantia
  insert into public.os_assinaturas (empresa_id, os_id, tipo, nome) values (v_alfa, v_os, 'entrega', 'Fulano');
  perform public.alterar_status_os(v_os, 'entregue');
  perform tests.ok((select garantia_ate from public.os where id = v_os) is null, 'devolução não gera garantia');
  perform tests.deslogar();
end;
$$;
