-- Fluxo do wizard de recebimento (Nova OS): exatamente o que as Server Actions
-- executam, com as permissões de cada papel.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_beta uuid := tests.empresa('beta');
  v_cli uuid;
  v_mot uuid;
  v_os public.os;
  v_item uuid;
  v_item2 uuid;
  v_outra_os uuid;
  v_path text;
begin
  select id into v_cli from public.clientes where empresa_id = v_alfa;
  select id into v_mot from public.motores where empresa_id = v_alfa;
  select id into v_outra_os from public.os where empresa_id = v_beta;

  -- Etapa 2: criar_os com dados do cliente do lojista e prazo
  perform tests.logar('a_balcao@t.local');
  v_os := public.criar_os(v_alfa, v_cli, v_mot, null, current_date + 7, 'Carlos', 'abc-1d23', '(11) 97777-6666', null, null, 'Urgente');
  perform tests.ok(v_os.status = 'em_recebimento', 'OS nasce em recebimento');
  perform tests.ok(v_os.cliente_final_placa = 'ABC1D23', 'placa do carro do lojista normalizada');
  perform tests.ok(v_os.cliente_final_telefone = '11977776666', 'telefone do carro só dígitos');
  perform tests.ok(v_os.prazo_prometido = current_date + 7 and v_os.observacoes = 'Urgente', 'prazo e observações gravados');
  perform tests.ok(v_os.checklist_concluido_em is null, 'checklist ainda não concluído');

  -- Etapa 3: itens OK por padrão; atualizar status, quantidade e observação
  select id into v_item from public.os_checklist_itens where os_id = v_os.id and descricao = 'Válvulas de admissão';
  select id into v_item2 from public.os_checklist_itens where os_id = v_os.id and grupo = 'Bloco' limit 1;
  perform tests.ok(tests.linhas(format(
    'update public.os_checklist_itens set status = ''ausente'', quantidade = 3, observacao = ''faltam 1'' where id = %L and os_id = %L and empresa_id = %L',
    v_item, v_os.id, v_alfa)) = 1, 'balcão atualiza item do checklist');
  perform tests.ok((select quantidade from public.os_checklist_itens where id = v_item) = 3, 'quantidade editada');
  perform tests.ok(tests.linhas(format(
    'update public.os_checklist_itens set status = ''na'' where os_id = %L and empresa_id = %L and grupo = ''Distribuição''',
    v_os.id, v_alfa)) = 5, 'grupo inteiro N/A');

  -- pendências na ordem que o wizard espera
  perform tests.ok(public.os_pendencias_para_status(v_os.id, 'recebido') ilike '%checklist%', 'pendência: checklist');
  perform tests.ok(tests.linhas(format(
    'update public.os set checklist_concluido_em = now() where id = %L and empresa_id = %L and status = ''em_recebimento''',
    v_os.id, v_alfa)) = 1, 'balcão conclui o checklist');
  perform tests.ok(public.os_pendencias_para_status(v_os.id, 'recebido') ilike '%3 fotos%', 'pendência: fotos');

  -- foto de item não conta como foto geral
  v_path := v_alfa || '/' || v_os.id || '/item-1.jpg';
  insert into public.os_anexos (empresa_id, os_id, etapa, storage_path, checklist_item_id)
    values (v_alfa, v_os.id, 'recebimento', v_path, v_item);
  for i in 1..2 loop
    insert into public.os_anexos (empresa_id, os_id, etapa, storage_path)
      values (v_alfa, v_os.id, 'recebimento', v_alfa || '/' || v_os.id || '/geral-' || i || '.jpg');
  end loop;
  perform tests.ok(public.os_pendencias_para_status(v_os.id, 'recebido') ilike '%3 fotos%',
    '2 fotos gerais + 1 de item ainda não bastam');

  -- retentativa do upload: mesmo caminho = violação de unicidade (a action trata como sucesso)
  perform tests.erro(format(
    'insert into public.os_anexos (empresa_id, os_id, etapa, storage_path) values (%L, %L, ''recebimento'', %L)',
    v_alfa, v_os.id, v_path), 'caminho repetido', 'duplicate');
  -- caminho fora de {empresa}/{os}/ é barrado
  perform tests.erro(format(
    'insert into public.os_anexos (empresa_id, os_id, etapa, storage_path) values (%L, %L, ''recebimento'', %L)',
    v_alfa, v_os.id, v_beta || '/' || v_os.id || '/x.jpg'), 'prefixo do caminho');

  insert into public.os_anexos (empresa_id, os_id, etapa, storage_path)
    values (v_alfa, v_os.id, 'recebimento', v_alfa || '/' || v_os.id || '/geral-3.jpg');
  perform tests.ok(public.os_pendencias_para_status(v_os.id, 'recebido') ilike '%assinatura%',
    'com 3 fotos gerais a pendência é só a assinatura');
  perform tests.erro(format('select public.alterar_status_os(%L, ''recebido'')', v_os.id),
    'sem assinatura não recebe', 'assinatura');

  -- Etapa 5: assinatura (imutável) e status recebido
  insert into public.os_assinaturas (empresa_id, os_id, tipo, nome, documento, imagem_path, ip, user_agent, registrado_por)
    values (v_alfa, v_os.id, 'recebimento', 'Maria da Silva', '12345678909',
            v_alfa || '/' || v_os.id || '/assinatura-recebimento-1.png', '203.0.113.9', 'teste',
            tests.membro('a_balcao@t.local', 'alfa'));
  perform tests.ok(tests.linhas(format('update public.os_assinaturas set nome = ''Outro'' where os_id = %L', v_os.id)) = 0,
    'assinatura é imutável (update não afeta linhas)');
  perform tests.ok((public.alterar_status_os(v_os.id, 'recebido')).status = 'recebido', 'OS recebida');
  perform tests.ok(public.os_pendencias_para_status(v_os.id, 'recebido') is null, 'sem pendências depois de recebida');
  perform tests.ok(tests.contar(format(
    'select 1 from public.os_status_historico where os_id = %L and status_para = ''recebido''', v_os.id)) = 1,
    'histórico registra recebido');

  -- depois de recebida, concluir de novo não acha OS em recebimento
  perform tests.ok(tests.linhas(format(
    'update public.os set checklist_concluido_em = now() where id = %L and empresa_id = %L and status = ''em_recebimento''',
    v_os.id, v_alfa)) = 0, 'OS recebida não é mais atualizada pelo wizard');

  -- Permissões
  perform tests.logar('a_tecnico@t.local');
  perform tests.ok(tests.linhas(format('update public.os_checklist_itens set status = ''ok'' where id = %L', v_item)) = 0,
    'técnico não edita checklist do recebimento');
  perform tests.erro(format(
    'insert into public.os_assinaturas (empresa_id, os_id, tipo, nome) values (%L, %L, ''recebimento'', ''X'')',
    v_alfa, v_os.id), 'técnico não assina recebimento');
  perform tests.erro(format('select public.criar_os(%L, %L)', v_alfa, v_cli), 'técnico não abre OS');

  perform tests.logar('a_financeiro@t.local');
  perform tests.erro(format('select public.criar_os(%L, %L)', v_alfa, v_cli), 'financeiro não abre OS');

  -- Isolamento: balcão da alfa não mexe na beta
  perform tests.logar('a_balcao@t.local');
  perform tests.erro(format('select public.criar_os(%L, %L)', v_beta, v_cli), 'balcão da alfa não abre OS na beta');
  perform tests.ok(tests.linhas(format(
    'update public.os set checklist_concluido_em = now() where id = %L', v_outra_os)) = 0,
    'balcão da alfa não conclui OS da beta');
  perform tests.erro(format(
    'insert into public.os_anexos (empresa_id, os_id, etapa, storage_path) values (%L, %L, ''recebimento'', %L)',
    v_beta, v_outra_os, v_beta || '/' || v_outra_os || '/x.jpg'), 'balcão da alfa não anexa na beta');
  perform tests.deslogar();
end;
$$;
