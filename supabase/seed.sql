-- =============================================================================
-- Seed de DESENVOLVIMENTO (supabase db reset / pnpm test:db).
-- O template padrão de checklist e o catálogo de exemplo estão na migration
-- 20261115121100_dados_padrao.sql (tabelas modelo_*) para existirem também em
-- produção; aqui criamos a empresa piloto e chamamos inicializar_empresa(), que
-- copia esse modelo para ela — o mesmo caminho de qualquer empresa nova.
--
-- Usuários de teste (senha: wl123456):
--   dono@wl.local · balcao@wl.local · tecnico@wl.local · financeiro@wl.local
-- =============================================================================

-- Usuários (colunas compatíveis com o auth.users do Supabase e com o shim)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('wl123456', extensions.gen_salt('bf')), now(),
       '', '', '', '',
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('nome', u.nome), now(), now()
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'dono@wl.local', 'Wagner'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'balcao@wl.local', 'Ana'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'tecnico@wl.local', 'Rafael'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'financeiro@wl.local', 'Lúcia')
) as u(id, email, nome)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@wl.local'
on conflict do nothing;

-- Empresa piloto
insert into public.empresas (id, slug, nome_fantasia, razao_social, telefone, endereco)
values (
  'e0000000-0000-4000-8000-000000000001', 'wl-retifica', 'WL Retífica de Motores', 'WL Retífica de Motores Ltda',
  '11999990000',
  '{"logradouro":"R. Dr. Mathias José de Barros Ponikwar","numero":"254","bairro":"Jardim Campo Belo","cidade":"","uf":"SP"}'
)
on conflict (id) do nothing;

insert into public.membros (empresa_id, user_id, nome, papel, limite_desconto_pct) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Wagner', 'dono', 100),
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Ana', 'balcao', 10),
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Rafael', 'tecnico', 0),
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'Lúcia', 'financeiro', 0)
on conflict (empresa_id, user_id) do nothing;

select public.inicializar_empresa('e0000000-0000-4000-8000-000000000001');

-- Clientes e motores de exemplo
insert into public.clientes (id, empresa_id, tipo, nome, nome_fantasia, documento, telefone_whatsapp, condicao_pagamento, dia_fechamento, limite_credito)
values
  ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'lojista',
   'Oficina Exemplo A Ltda', 'Oficina Exemplo A', '12345678000190', '11988887777', 'Faturado quinzenal', 15, 5000),
  ('c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'final',
   'Cliente Exemplo B', null, '12345678909', '11977776666', 'À vista', null, null)
on conflict (id) do nothing;

insert into public.motores (id, empresa_id, cliente_id, marca, modelo, codigo_motor, numero_serie, combustivel, cilindros, cilindrada, valvulas_por_cilindro, veiculo_placa, veiculo_modelo)
values
  ('d0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'VW', 'EA111', 'CFZ', 'CFZ123456', 'flex', 4, '1.6', 2, 'ABC1D23', 'Gol'),
  ('d0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
   'Fiat', 'Fire', '310A', 'FIRE998877', 'flex', 4, '1.0', 2, 'XYZ9A87', 'Uno')
on conflict (id) do nothing;

-- Uma OS em recebimento, criada como o balcão (passa pelas mesmas regras do app)
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', false);
select public.criar_os(
  p_empresa_id => 'e0000000-0000-4000-8000-000000000001',
  p_cliente_id => 'c0000000-0000-4000-8000-000000000001',
  p_motor_id => 'd0000000-0000-4000-8000-000000000001',
  p_prazo_prometido => (current_date + 7),
  p_cliente_final_nome => 'João (dono do Gol)',
  p_cliente_final_placa => 'ABC-1D23'
)
where not exists (select 1 from public.os where empresa_id = 'e0000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', '', false);
