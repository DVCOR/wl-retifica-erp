-- Copiado de supabase/supabase docker/volumes/db/realtime.sql (self-hosting oficial).
\set pguser `echo "$POSTGRES_USER"`

create schema if not exists _realtime;
alter schema _realtime owner to :pguser;
