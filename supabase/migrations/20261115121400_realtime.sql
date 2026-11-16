-- =============================================================================
-- Realtime para o quadro de OS (só se a publicação do Supabase existir).
-- A RLS de `os` vale para os eventos recebidos pelo cliente.
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.os;
    alter publication supabase_realtime add table public.os_status_historico;
  end if;
end;
$$;
