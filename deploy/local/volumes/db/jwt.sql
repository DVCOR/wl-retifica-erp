-- Copiado de supabase/supabase docker/volumes/db/jwt.sql (self-hosting oficial).
\set jwt_exp `echo "$JWT_EXP"`

ALTER DATABASE postgres SET "app.settings.jwt_exp" TO :'jwt_exp';
