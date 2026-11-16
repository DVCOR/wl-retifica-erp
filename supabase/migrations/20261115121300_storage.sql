-- =============================================================================
-- Storage (só no Supabase real; o test:db pula este arquivo se não houver o
-- schema storage). Bucket privado os-anexos, caminho {empresa_id}/{os_id}/...
-- Bucket público empresa-logos, caminho {empresa_id}/logo.png
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('os-anexos', 'os-anexos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('empresa-logos', 'empresa-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Primeiro segmento do caminho = empresa_id
create or replace function public.storage_empresa_id(p_nome text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (string_to_array(p_nome, '/'))[1]::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function public.storage_empresa_id(text) to authenticated;

create policy "os-anexos: membros leem" on storage.objects for select to authenticated
  using (bucket_id = 'os-anexos' and public.storage_empresa_id(name) in (select public.empresas_do_usuario()));

create policy "os-anexos: dono, balcão e técnico enviam" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'os-anexos'
    and public.tem_papel(public.storage_empresa_id(name), array['dono', 'balcao', 'tecnico']::public.papel[])
  );

create policy "os-anexos: dono e balcão apagam" on storage.objects for delete to authenticated
  using (
    bucket_id = 'os-anexos'
    and public.tem_papel(public.storage_empresa_id(name), array['dono', 'balcao']::public.papel[])
  );

create policy "empresa-logos: dono envia" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'empresa-logos'
    and public.tem_papel(public.storage_empresa_id(name), array['dono']::public.papel[])
  );

create policy "empresa-logos: dono atualiza" on storage.objects for update to authenticated
  using (
    bucket_id = 'empresa-logos'
    and public.tem_papel(public.storage_empresa_id(name), array['dono']::public.papel[])
  );

create policy "empresa-logos: dono apaga" on storage.objects for delete to authenticated
  using (
    bucket_id = 'empresa-logos'
    and public.tem_papel(public.storage_empresa_id(name), array['dono']::public.papel[])
  );
