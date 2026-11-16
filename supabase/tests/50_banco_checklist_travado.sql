-- Checklist travado depois que a OS sai de em_recebimento (exceto dono, com motivo auditado).
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_item uuid;
  v_aud public.auditoria;
begin
  select id into v_os from public.os where empresa_id = v_alfa;
  select id into v_item from public.os_checklist_itens where os_id = v_os order by ordem limit 1;

  -- em recebimento: balcão edita livremente
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(tests.linhas(format(
    'update public.os_checklist_itens set status = ''danificado'' where id = %L', v_item)) = 1,
    'balcão edita durante o recebimento');
  perform tests.receber_os(v_os);
  perform tests.ok((select status from public.os where id = v_os) = 'recebido', 'OS recebida');

  -- depois do recebimento: ninguém altera direto
  perform tests.erro(format('update public.os_checklist_itens set status = ''ok'' where id = %L', v_item),
    'balcão não altera checklist travado', 'travado');
  perform tests.erro(format('delete from public.os_checklist_itens where id = %L', v_item),
    'balcão não apaga item travado', 'travado');
  perform tests.erro(format(
    'insert into public.os_checklist_itens (empresa_id, os_id, grupo, descricao) values (%L, %L, ''X'', ''Novo'')',
    v_alfa, v_os), 'balcão não insere item travado', 'travado');
  perform tests.erro(format('select public.corrigir_checklist_os(%L, ''motivo qualquer'', ''ok'')', v_item),
    'balcão não usa a correção', 'só o dono');

  perform tests.logar('a_dono@t.local');
  perform tests.erro(format('update public.os_checklist_itens set status = ''ok'' where id = %L', v_item),
    'nem o dono altera sem motivo', 'travado');
  perform tests.erro(format('select public.corrigir_checklist_os(%L, ''  '', ''ok'')', v_item),
    'correção exige motivo', 'motivo');

  perform public.corrigir_checklist_os(v_item, 'Cliente trouxe a peça depois', 'ok', null, 'Entregue em mãos');
  perform tests.ok((select status from public.os_checklist_itens where id = v_item) = 'ok', 'dono corrigiu o status');
  perform tests.ok((select observacao from public.os_checklist_itens where id = v_item) = 'Entregue em mãos',
    'observação corrigida');
  select * into v_aud from public.auditoria
   where tabela = 'os_checklist_itens' and registro_id = v_item order by id desc limit 1;
  perform tests.ok(v_aud.motivo = 'Cliente trouxe a peça depois', 'motivo registrado na auditoria');
  perform tests.ok(v_aud.acao = 'UPDATE' and v_aud.dados_antes ->> 'status' = 'danificado'
    and v_aud.dados_depois ->> 'status' = 'ok', 'auditoria guarda antes e depois');
  perform tests.ok(v_aud.membro_id = tests.membro('a_dono@t.local', 'alfa'), 'auditoria guarda quem corrigiu');

  -- o motivo não vaza para o próximo comando
  perform tests.erro(format('update public.os_checklist_itens set status = ''na'' where id = %L', v_item),
    'motivo vale só para a correção', 'travado');

  -- dono lê a auditoria; balcão não
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(tests.contar(format(
    'select 1 from public.auditoria where tabela = ''os_checklist_itens'' and registro_id = %L', v_item)) = 0,
    'balcão não lê auditoria');

  -- outra empresa não corrige
  perform tests.logar('b_dono@t.local');
  perform tests.erro(format('select public.corrigir_checklist_os(%L, ''motivo'', ''ok'')', v_item),
    'dono da beta não acha o item da alfa', 'não encontrado');
end;
$$;
