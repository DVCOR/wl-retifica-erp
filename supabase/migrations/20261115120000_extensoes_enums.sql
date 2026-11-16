-- =============================================================================
-- Extensões, funções utilitárias e enums
-- =============================================================================

create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() não é IMMUTABLE; este wrapper permite usar em índices.
create or replace function public.f_unaccent(texto text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, texto)
$$;

-- Normaliza texto para busca: sem acento, minúsculo.
create or replace function public.normalizar_busca(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(public.f_unaccent(coalesce(texto, '')))
$$;

-- Só dígitos/letras em maiúsculo (placa, documento).
create or replace function public.so_alfanumerico(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(upper(regexp_replace(coalesce(texto, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

-- Trigger genérico de updated_at.
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create type public.papel as enum ('dono', 'balcao', 'tecnico', 'financeiro');
create type public.cliente_tipo as enum ('lojista', 'final');
create type public.os_status as enum (
  'em_recebimento',   -- rascunho enquanto o wizard de recebimento não termina
  'recebido',
  'em_analise',
  'orcamento_enviado',
  'aprovado',
  'reprovado',
  'em_execucao',
  'aguardando_peca',
  'pronto',
  'entregue',
  'cancelado'
);
create type public.checklist_status as enum ('ok', 'danificado', 'ausente', 'na');
create type public.orcamento_status as enum ('rascunho', 'enviado', 'aprovado', 'reprovado', 'substituido');
create type public.item_tipo as enum ('servico', 'peca');
create type public.anexo_etapa as enum ('recebimento', 'analise', 'execucao', 'entrega');
create type public.assinatura_tipo as enum ('recebimento', 'aprovacao', 'entrega');
create type public.canal as enum ('link', 'whatsapp', 'presencial', 'telefone');
create type public.unidade_servico as enum ('un', 'cilindro', 'valvula', 'hora');
create type public.combustivel as enum ('gasolina', 'etanol', 'flex', 'diesel', 'gnv');
