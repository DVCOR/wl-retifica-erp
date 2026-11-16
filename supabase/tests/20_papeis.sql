-- Matriz de papéis (SPEC item 3) aplicada no banco.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_cli uuid;
  v_os uuid;
  v_item uuid;
  v_tec uuid := tests.membro('a_tecnico@t.local', 'alfa');
  v_os2 public.os;
begin
  select id into v_cli from public.clientes where empresa_id = v_alfa;
  select id into v_os from public.os where empresa_id = v_alfa;
  select id into v_item from public.os_checklist_itens where os_id = v_os limit 1;

  -- ---------------------------------------------------------------- balcão
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(tests.linhas(format(
    'insert into public.clientes (empresa_id, tipo, nome) values (%L, ''final'', ''Novo'')', v_alfa)) = 1,
    'balcão cadastra cliente');
  perform tests.ok(tests.linhas(format('update public.clientes set nome = ''Editado'' where id = %L', v_cli)) = 1,
    'balcão edita cliente');
  perform tests.ok(tests.linhas(format('delete from public.clientes where id = %L', v_cli)) = 0,
    'balcão não apaga cliente');
  perform tests.erro(format(
    'insert into public.servicos (empresa_id, nome) values (%L, ''X'')', v_alfa), 'balcão não altera catálogo');
  perform tests.ok(tests.contar(format('select 1 from public.servicos where empresa_id = %L', v_alfa)) > 0,
    'balcão vê catálogo com preço');
  perform tests.ok(tests.linhas(format('update public.empresas set nome_fantasia = ''x'' where id = %L', v_alfa)) = 0,
    'balcão não altera configurações da empresa');
  perform tests.ok(tests.linhas(format('update public.membros set papel = ''dono'' where empresa_id = %L', v_alfa)) = 0,
    'balcão não gerencia membros');
  perform tests.erro(format(
    'insert into public.convites (empresa_id, email, papel) values (%L, ''x@t.local'', ''dono'')', v_alfa),
    'balcão não convida');
  perform tests.ok(tests.linhas(format('update public.os_checklist_itens set status = ''danificado'' where id = %L', v_item)) = 1,
    'balcão preenche checklist');
  perform tests.ok(tests.contar('select 1 from public.auditoria') = 0, 'balcão não vê auditoria');
  perform tests.ok((public.criar_os(v_alfa, v_cli)).numero is not null, 'balcão abre OS');

  -- status só por função; pré-condições do recebido
  perform tests.erro(format('update public.os set status = ''recebido'' where id = %L', v_os),
    'status não muda por update direto', 'alterar_status_os');
  perform tests.erro(format('select public.alterar_status_os(%L, ''recebido'')', v_os),
    'recebido exige checklist', 'checklist');
  update public.os set checklist_concluido_em = now() where id = v_os;
  perform tests.erro(format('select public.alterar_status_os(%L, ''recebido'')', v_os),
    'recebido exige 3 fotos', 'fotos');
  perform tests.erro(format('select public.alterar_status_os(%L, ''pronto'')', v_os),
    'transição inválida', 'não é possível');
  perform tests.receber_os(v_os);
  perform tests.ok((select status from public.os where id = v_os) = 'recebido', 'OS recebida');
  perform tests.erro(format('select public.alterar_status_os(%L, ''cancelado'', ''desistiu'')', v_os),
    'balcão não cancela', 'papel');
  -- atribui o técnico
  update public.os set tecnico_id = v_tec where id = v_os;

  -- ---------------------------------------------------------------- técnico
  perform tests.logar('a_tecnico2@t.local');
  perform tests.erro(format('select public.alterar_status_os(%L, ''em_analise'')', v_os),
    'técnico não atribuído não muda status', 'atribuídas');

  perform tests.logar('a_tecnico@t.local');
  perform tests.erro(format(
    'insert into public.clientes (empresa_id, tipo, nome) values (%L, ''final'', ''X'')', v_alfa),
    'técnico não cadastra cliente');
  perform tests.ok(tests.linhas(format('update public.clientes set nome = ''x'' where id = %L', v_cli)) = 0,
    'técnico não edita cliente');
  perform tests.ok(tests.contar(format('select 1 from public.clientes where id = %L', v_cli)) = 1,
    'técnico vê o cliente (nome no cartão da OS)');
  perform tests.erro(format('select public.criar_os(%L, %L)', v_alfa, v_cli), 'técnico não abre OS');
  perform tests.ok(tests.linhas(format('update public.os_checklist_itens set status = ''ok'' where id = %L', v_item)) = 0,
    'técnico não altera checklist de recebimento');
  perform tests.ok(tests.linhas(format('update public.os set observacoes = ''x'' where id = %L', v_os)) = 0,
    'técnico não edita a OS diretamente');
  perform tests.ok((public.alterar_status_os(v_os, 'em_analise')).status = 'em_analise',
    'técnico atribuído move para em_analise');
  perform tests.ok(tests.linhas(format(
    'insert into public.os_medicoes (empresa_id, os_id, componente, descricao, valor, unidade, minimo, maximo)
     values (%L, %L, ''Cabeçote'', ''Empenamento da face'', 0.08, ''mm'', 0, 0.05)', v_alfa, v_os)) = 1,
    'técnico registra medição');
  perform tests.ok((select conforme from public.os_medicoes where os_id = v_os) = false,
    'medição fora da faixa = não conforme');
  perform tests.ok(tests.linhas(format(
    'insert into public.apontamentos (empresa_id, os_id, inicio, fim) values (%L, %L, now() - interval ''30 min'', now())',
    v_alfa, v_os)) = 1, 'técnico aponta serviço');
  perform tests.ok((select minutos from public.apontamentos where os_id = v_os) = 30, 'minutos calculados');
  perform tests.erro(format(
    'insert into public.apontamentos (empresa_id, os_id, membro_id) values (%L, %L, %L)',
    v_alfa, v_os, tests.membro('a_tecnico2@t.local', 'alfa')),
    'técnico não aponta em nome de outro');
  perform tests.erro(format(
    'insert into public.orcamentos (empresa_id, os_id) values (%L, %L)', v_alfa, v_os),
    'técnico não cria orçamento');
  perform tests.erro(format(
    'insert into public.os_assinaturas (empresa_id, os_id, tipo, nome) values (%L, %L, ''entrega'', ''x'')', v_alfa, v_os),
    'técnico não registra entrega');

  -- ---------------------------------------------------------------- financeiro
  perform tests.logar('a_financeiro@t.local');
  perform tests.ok(tests.linhas(format(
    'update public.clientes set limite_credito = 1000, dia_fechamento = 10 where id = %L', v_cli)) = 1,
    'financeiro altera dados financeiros');
  perform tests.erro(format('update public.clientes set nome = ''Outro'' where id = %L', v_cli),
    'financeiro não altera dados cadastrais', 'financeiro');
  perform tests.erro(format(
    'insert into public.clientes (empresa_id, tipo, nome) values (%L, ''final'', ''X'')', v_alfa),
    'financeiro não cadastra cliente');
  perform tests.erro(format('select public.criar_os(%L, %L)', v_alfa, v_cli), 'financeiro não abre OS');
  perform tests.erro(format('select public.alterar_status_os(%L, ''em_execucao'')', v_os),
    'financeiro não move na bancada');
  perform tests.ok(tests.contar(format('select 1 from public.servicos where empresa_id = %L', v_alfa)) > 0,
    'financeiro vê catálogo');

  -- ---------------------------------------------------------------- dono
  perform tests.logar('a_dono@t.local');
  perform tests.ok(tests.linhas(format(
    'update public.membros set limite_desconto_pct = 20 where id = %L', tests.membro('a_balcao@t.local', 'alfa'))) = 1,
    'dono gerencia membros');
  perform tests.ok(tests.linhas(format(
    'insert into public.convites (empresa_id, email, papel) values (%L, ''novo@t.local'', ''balcao'')', v_alfa)) = 1,
    'dono convida');
  perform tests.ok(tests.linhas(format(
    'update public.empresas set config = config || ''{"validade_orcamento_dias": 10}'' where id = %L', v_alfa)) = 1,
    'dono altera configurações');
  perform tests.ok(tests.linhas(format(
    'insert into public.servicos (empresa_id, nome, preco_base) values (%L, ''Serviço novo'', 10)', v_alfa)) = 1,
    'dono altera catálogo');
  perform tests.ok(tests.contar('select 1 from public.auditoria') > 0, 'dono vê auditoria');
  perform tests.erro(format(
    'update public.membros set papel = ''balcao'' where id = %L', tests.membro('a_dono@t.local', 'alfa')),
    'não pode ficar sem dono', 'dono');
  perform tests.erro(format('select public.alterar_status_os(%L, ''cancelado'')', v_os),
    'cancelar exige motivo', 'motivo');
  v_os2 := public.alterar_status_os(v_os, 'cancelado', 'Cliente desistiu');
  perform tests.ok(v_os2.status = 'cancelado' and v_os2.motivo_cancelamento = 'Cliente desistiu', 'dono cancela');

  -- histórico registra cada mudança com quem e motivo
  perform tests.ok((select count(*) from public.os_status_historico where os_id = v_os) = 4,
    'histórico: em_recebimento, recebido, em_analise, cancelado');
  perform tests.ok(exists (select 1 from public.os_status_historico
    where os_id = v_os and status_para = 'cancelado' and motivo = 'Cliente desistiu'
      and membro_id = tests.membro('a_dono@t.local', 'alfa')), 'histórico guarda membro e motivo');
  perform tests.ok(exists (select 1 from public.os_status_historico
    where os_id = v_os and status_para = 'em_analise' and membro_id = v_tec), 'histórico guarda o técnico');
  perform tests.deslogar();
end;
$$;
