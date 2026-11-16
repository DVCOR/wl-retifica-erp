-- =============================================================================
-- RLS em todas as tabelas + views sem preço + grants
--
-- Regras gerais:
--  * leitura: membro ativo da empresa  -> empresa_id in (select empresas_do_usuario())
--  * escrita: conforme a matriz de papéis (SPEC item 3) -> tem_papel(empresa_id, ...)
--  * preços: tabelas com colunas de preço só são legíveis por pode_ver_precos();
--    o técnico usa as views v_* (sem preço).
--  * status da OS / orçamento: só por funções (alterar_status_os, enviar_orcamento,
--    responder_orcamento...), protegidas por trigger.
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'empresas', 'membros', 'convites', 'clientes', 'motores', 'servicos', 'pecas', 'tabelas_preco',
    'tabela_preco_itens', 'kits', 'kit_itens', 'checklist_templates', 'checklist_template_itens',
    'modelo_checklist_itens', 'modelo_servicos', 'os_sequencias', 'os', 'os_status_historico',
    'os_checklist_itens', 'os_medicoes', 'os_anexos', 'os_assinaturas', 'orcamentos', 'orcamento_itens',
    'apontamentos', 'auditoria'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- empresas
create policy empresas_select on public.empresas for select to authenticated
  using (id in (select public.empresas_do_usuario()));
create policy empresas_update on public.empresas for update to authenticated
  using (public.tem_papel(id, array['dono']::public.papel[]))
  with check (public.tem_papel(id, array['dono']::public.papel[]));
-- insert: só via criar_empresa(); delete: só service role.

-- ---------------------------------------------------------------- membros
create policy membros_select on public.membros for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy membros_update on public.membros for update to authenticated
  using (public.tem_papel(empresa_id, array['dono']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono']::public.papel[]));
create policy membros_delete on public.membros for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono']::public.papel[]));
-- insert: só via aceitar_convite() / criar_empresa().

-- ---------------------------------------------------------------- convites
create policy convites_dono on public.convites for all to authenticated
  using (public.tem_papel(empresa_id, array['dono']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono']::public.papel[]));

-- ---------------------------------------------------------------- clientes
create policy clientes_select on public.clientes for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy clientes_insert on public.clientes for insert to authenticated
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy clientes_update on public.clientes for update to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao', 'financeiro']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono', 'balcao', 'financeiro']::public.papel[]));
create policy clientes_delete on public.clientes for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono']::public.papel[]));

-- ---------------------------------------------------------------- motores
create policy motores_select on public.motores for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy motores_insert on public.motores for insert to authenticated
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy motores_update on public.motores for update to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy motores_delete on public.motores for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono']::public.papel[]));

-- ---------------------------------------------------------------- catálogo com preço
-- leitura: quem pode ver preço; escrita: dono
do $$
declare
  t text;
begin
  foreach t in array array['servicos', 'pecas', 'tabelas_preco', 'tabela_preco_itens'] loop
    execute format($f$
      create policy %1$I on public.%2$I for select to authenticated
        using (public.pode_ver_precos(empresa_id));
      create policy %3$I on public.%2$I for insert to authenticated
        with check (public.tem_papel(empresa_id, array['dono']::public.papel[]));
      create policy %4$I on public.%2$I for update to authenticated
        using (public.tem_papel(empresa_id, array['dono']::public.papel[]))
        with check (public.tem_papel(empresa_id, array['dono']::public.papel[]));
      create policy %5$I on public.%2$I for delete to authenticated
        using (public.tem_papel(empresa_id, array['dono']::public.papel[]));
    $f$, t || '_select', t, t || '_insert', t || '_update', t || '_delete');
  end loop;
end;
$$;

-- ---------------------------------------------------------------- kits e templates (sem preço)
-- leitura: membros; escrita: dono
do $$
declare
  t text;
begin
  foreach t in array array['kits', 'kit_itens', 'checklist_templates', 'checklist_template_itens'] loop
    execute format($f$
      create policy %1$I on public.%2$I for select to authenticated
        using (empresa_id in (select public.empresas_do_usuario()));
      create policy %3$I on public.%2$I for insert to authenticated
        with check (public.tem_papel(empresa_id, array['dono']::public.papel[]));
      create policy %4$I on public.%2$I for update to authenticated
        using (public.tem_papel(empresa_id, array['dono']::public.papel[]))
        with check (public.tem_papel(empresa_id, array['dono']::public.papel[]));
      create policy %5$I on public.%2$I for delete to authenticated
        using (public.tem_papel(empresa_id, array['dono']::public.papel[]));
    $f$, t || '_select', t, t || '_insert', t || '_update', t || '_delete');
  end loop;
end;
$$;

-- ---------------------------------------------------------------- modelos globais (só leitura)
create policy modelo_checklist_itens_select on public.modelo_checklist_itens for select to authenticated
  using (true);
create policy modelo_servicos_select on public.modelo_servicos for select to authenticated
  using (true);

-- os_sequencias: sem políticas (só proximo_numero_os(), security definer).

-- ---------------------------------------------------------------- os
create policy os_select on public.os for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy os_insert on public.os for insert to authenticated
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy os_update on public.os for update to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy os_delete on public.os for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono']::public.papel[]));

create policy os_status_historico_select on public.os_status_historico for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));

-- ---------------------------------------------------------------- checklist da OS: dono/balcão
create policy os_checklist_itens_select on public.os_checklist_itens for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy os_checklist_itens_insert on public.os_checklist_itens for insert to authenticated
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy os_checklist_itens_update on public.os_checklist_itens for update to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy os_checklist_itens_delete on public.os_checklist_itens for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));

-- ---------------------------------------------------------------- medições: dono/técnico
create policy os_medicoes_select on public.os_medicoes for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy os_medicoes_insert on public.os_medicoes for insert to authenticated
  with check (public.tem_papel(empresa_id, array['dono', 'tecnico']::public.papel[]));
create policy os_medicoes_update on public.os_medicoes for update to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'tecnico']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono', 'tecnico']::public.papel[]));
create policy os_medicoes_delete on public.os_medicoes for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'tecnico']::public.papel[]));

-- ---------------------------------------------------------------- anexos (fotos)
create policy os_anexos_select on public.os_anexos for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy os_anexos_insert on public.os_anexos for insert to authenticated
  with check (
    public.tem_papel(empresa_id, array['dono', 'balcao', 'tecnico']::public.papel[])
    and (criado_por is null or criado_por = public.membro_atual(empresa_id))
  );
create policy os_anexos_delete on public.os_anexos for delete to authenticated
  using (
    public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[])
    or criado_por = public.membro_atual(empresa_id)
  );

-- ---------------------------------------------------------------- assinaturas (imutáveis)
create policy os_assinaturas_select on public.os_assinaturas for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy os_assinaturas_insert on public.os_assinaturas for insert to authenticated
  with check (
    (tipo = 'recebimento' and public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]))
    or (tipo = 'entrega' and public.tem_papel(empresa_id, array['dono', 'balcao', 'financeiro']::public.papel[]))
    or (tipo = 'aprovacao' and public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]))
  );

-- ---------------------------------------------------------------- orçamento (com preço)
create policy orcamentos_select on public.orcamentos for select to authenticated
  using (public.pode_ver_precos(empresa_id));
create policy orcamentos_insert on public.orcamentos for insert to authenticated
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy orcamentos_update on public.orcamentos for update to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy orcamentos_delete on public.orcamentos for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]) and status = 'rascunho');

create policy orcamento_itens_select on public.orcamento_itens for select to authenticated
  using (public.pode_ver_precos(empresa_id));
-- técnico também insere (sugestão); o trigger zera preço/desconto dele e só aceita rascunho.
create policy orcamento_itens_insert on public.orcamento_itens for insert to authenticated
  with check (public.tem_papel(empresa_id, array['dono', 'balcao', 'tecnico']::public.papel[]));
create policy orcamento_itens_update on public.orcamento_itens for update to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]))
  with check (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));
create policy orcamento_itens_delete on public.orcamento_itens for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono', 'balcao']::public.papel[]));

-- ---------------------------------------------------------------- apontamentos
create policy apontamentos_select on public.apontamentos for select to authenticated
  using (empresa_id in (select public.empresas_do_usuario()));
create policy apontamentos_insert on public.apontamentos for insert to authenticated
  with check (
    public.tem_papel(empresa_id, array['dono']::public.papel[])
    or (public.tem_papel(empresa_id, array['tecnico']::public.papel[])
        and membro_id = public.membro_atual(empresa_id))
  );
create policy apontamentos_update on public.apontamentos for update to authenticated
  using (
    public.tem_papel(empresa_id, array['dono']::public.papel[])
    or (public.tem_papel(empresa_id, array['tecnico']::public.papel[])
        and membro_id = public.membro_atual(empresa_id))
  )
  with check (
    public.tem_papel(empresa_id, array['dono']::public.papel[])
    or (public.tem_papel(empresa_id, array['tecnico']::public.papel[])
        and membro_id = public.membro_atual(empresa_id))
  );
create policy apontamentos_delete on public.apontamentos for delete to authenticated
  using (public.tem_papel(empresa_id, array['dono']::public.papel[]));

-- ---------------------------------------------------------------- auditoria
create policy auditoria_select on public.auditoria for select to authenticated
  using (public.tem_papel(empresa_id, array['dono']::public.papel[]));

-- =============================================================================
-- Views sem preço (para o técnico; servem para todos os membros).
-- Rodam com os direitos do dono da view (sem RLS da tabela base), por isso
-- filtram a empresa explicitamente. security_barrier evita vazamento por
-- funções no WHERE do chamador.
-- =============================================================================
create view public.v_servicos_catalogo with (security_barrier = true) as
  select s.id, s.empresa_id, s.codigo, s.nome, s.categoria, s.unidade, s.tempo_padrao_min, s.ativo
  from public.servicos s
  where s.empresa_id in (select public.empresas_do_usuario());

create view public.v_pecas_catalogo with (security_barrier = true) as
  select p.id, p.empresa_id, p.codigo, p.descricao, p.marca, p.unidade, p.ativo
  from public.pecas p
  where p.empresa_id in (select public.empresas_do_usuario());

create view public.v_orcamento_itens_sem_preco with (security_barrier = true) as
  select i.id, i.empresa_id, o.os_id, i.orcamento_id, o.versao, o.status as orcamento_status,
         i.tipo, i.servico_id, i.peca_id, i.descricao, i.quantidade, i.ordem,
         i.sugerido_por_medicao_id, i.sugerido_por
  from public.orcamento_itens i
  join public.orcamentos o on o.id = i.orcamento_id
  where i.empresa_id in (select public.empresas_do_usuario());

-- =============================================================================
-- Grants
-- O Supabase concede tudo a anon/authenticated por padrão; a RLS é a barreira.
-- Reforço: anon não acessa tabelas; funções só por lista explícita.
-- =============================================================================
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.v_servicos_catalogo, public.v_pecas_catalogo, public.v_orcamento_itens_sem_preco
  to authenticated;
revoke insert, update, delete, truncate on public.v_servicos_catalogo, public.v_pecas_catalogo,
  public.v_orcamento_itens_sem_preco from authenticated;
revoke all on public.os_sequencias, public.auditoria from authenticated;
grant select on public.auditoria to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on function
  public._aplicar_status_os(uuid, public.os_status, text),
  public._responder_orcamento(uuid, boolean, text, public.canal, text, text),
  public._preco_sugerido(uuid, uuid, uuid, uuid),
  public.recalcular_orcamento(uuid),
  public.os_publica_fotos(uuid)
from authenticated;

-- Página pública e convite: anon também.
grant execute on function
  public.os_publica(uuid),
  public.responder_orcamento_publico(uuid, boolean, text, text, text),
  public.convite_info(uuid)
to anon;

alter default privileges in schema public revoke execute on functions from public;
