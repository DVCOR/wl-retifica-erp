-- Endurecimento: caminhos de storage, membros imutáveis, slugs, assinaturas, default privileges.
select tests.cenario();

do $$
declare
  v_alfa uuid := tests.empresa('alfa');
  v_os uuid;
  v_pref text;
  v_membro uuid := tests.membro('a_balcao@t.local', 'alfa');
  v_outro uuid;
  v_uid_b uuid;
begin
  select user_id into v_uid_b from public.membros where empresa_id = tests.empresa('beta') limit 1;
  select id into v_os from public.os where empresa_id = v_alfa;
  v_pref := v_alfa || '/' || v_os || '/';

  -- 1. caminhos
  perform tests.logar('a_balcao@t.local');
  perform tests.ok(tests.linhas(format(
    'insert into public.os_anexos (empresa_id, os_id, etapa, storage_path) values (%L, %L, ''recebimento'', %L)', v_alfa, v_os, v_pref || 'foto.jpg')) = 1,
    'caminho normal é aceito');
  perform tests.erro(format('insert into public.os_anexos (empresa_id, os_id, etapa, storage_path) values (%L, %L, ''recebimento'', %L)',
    v_alfa, v_os, v_pref || '../x.jpg'), 'rejeita ..', 'os_anexos_storage_path_seguro');
  perform tests.erro(format('insert into public.os_anexos (empresa_id, os_id, etapa, storage_path) values (%L, %L, ''recebimento'', %L)',
    v_alfa, v_os, v_pref || 'a//b.jpg'), 'rejeita //', 'os_anexos_storage_path_seguro');
  perform tests.erro(format('insert into public.os_anexos (empresa_id, os_id, etapa, storage_path) values (%L, %L, ''recebimento'', %L)',
    v_alfa, v_os, v_pref || 'a\b.jpg'), 'rejeita barra invertida', 'os_anexos_storage_path_seguro');
  perform tests.erro(format('insert into public.os_anexos (empresa_id, os_id, etapa, storage_path) values (%L, %L, ''recebimento'', %L)',
    v_alfa, v_os, v_pref || E'a\nb.jpg'), 'rejeita caractere de controle', 'os_anexos_storage_path_seguro');
  perform tests.erro(format('insert into public.os_assinaturas (empresa_id, os_id, tipo, nome, imagem_path) values (%L, %L, ''recebimento'', ''X'', %L)',
    v_alfa, v_os, v_pref || '../x.png'), 'assinatura: rejeita ..', 'os_assinaturas_imagem_path_seguro');
  perform tests.erro(format('insert into public.os_assinaturas (empresa_id, os_id, tipo, nome, imagem_path) values (%L, %L, ''recebimento'', ''X'', %L)',
    v_alfa, v_os, 'outra/pasta/x.png'), 'assinatura: exige prefixo', 'os_assinaturas_imagem_path_seguro');

  -- 5. aprovação direta
  perform tests.erro(format('insert into public.os_assinaturas (empresa_id, os_id, tipo, nome) values (%L, %L, ''aprovacao'', ''X'')',
    v_alfa, v_os), 'balcão não insere assinatura de aprovação direto', 'row-level security');
  perform tests.logar('a_dono@t.local');
  perform tests.erro(format('insert into public.os_assinaturas (empresa_id, os_id, tipo, nome) values (%L, %L, ''aprovacao'', ''X'')',
    v_alfa, v_os), 'nem o dono', 'row-level security');

  -- 3. membros imutáveis
  v_outro := tests.membro('a_tecnico@t.local', 'alfa');
  perform tests.erro(format('update public.membros set user_id = %L where id = %L', v_uid_b, v_outro),
    'dono não troca o usuário do membro', 'trocar o usuário');
  perform tests.erro(format('update public.membros set empresa_id = %L where id = %L', tests.empresa('beta'), v_outro),
    'dono não muda a empresa do membro', 'trocar o usuário');
  perform tests.ok(tests.linhas(format('update public.membros set nome = ''Novo'', ativo = false, limite_desconto_pct = 5 where id = %L', v_outro)) = 1,
    'dono ainda altera nome/ativo/limite');

  -- 4. slugs
  perform tests.logar('sem_empresa@t.local');
  perform tests.erro('select public.criar_empresa(''X'', ''login'', ''Eu'')', 'slug reservado', 'reservado');
  perform tests.erro('select public.criar_empresa(''X'', ''Admin'', ''Eu'')', 'slug reservado (caixa)', 'reservado');
  perform tests.erro('select public.criar_empresa(''X'', ''ab'', ''Eu'')', 'slug curto', 'inválido');
  perform tests.erro('select public.criar_empresa(''X'', ''a--b'', ''Eu'')', 'hífen duplo', 'inválido');
  perform tests.erro('select public.criar_empresa(''X'', ''-abc'', ''Eu'')', 'começa com hífen', 'inválido');
  perform tests.erro('select public.criar_empresa(''X'', ''abc-'', ''Eu'')', 'termina com hífen', 'inválido');
  perform tests.erro('select public.criar_empresa(''X'', ''a_bc'', ''Eu'')', 'underscore', 'inválido');
  perform tests.erro(format('select public.criar_empresa(''X'', %L, ''Eu'')', repeat('a', 41)), 'slug longo', 'inválido');
  perform tests.ok((public.criar_empresa('Oficina', 'oficina-1', 'Eu')).slug = 'oficina-1', 'slug válido criado');
end $$;

-- 2. default privileges: objetos futuros não ficam expostos ao anônimo
do $$
begin
  perform tests.deslogar();
  create table public.zz_tabela_futura (id int);
  create function public.zz_funcao_futura() returns int language sql as 'select 1';
  perform tests.ok(not has_table_privilege('anon', 'public.zz_tabela_futura', 'select'), 'anon sem acesso a tabela nova');
  perform tests.ok(not has_function_privilege('anon', 'public.zz_funcao_futura()', 'execute'), 'anon sem execute em função nova');
  perform tests.ok(not has_function_privilege('public', 'public.zz_funcao_futura()', 'execute'), 'public sem execute em função nova');
end $$;
