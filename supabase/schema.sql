-- IGAF L2 — script réexécutable (Supabase > SQL Editor)
create extension if not exists pgcrypto;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course text not null,
  category text not null default 'Support de cours',
  file_path text not null unique,
  filename text not null,
  mime_type text not null default 'application/pdf',
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

grant usage on schema public to anon, authenticated;
grant select on table public.resources to anon, authenticated;
grant insert, update, delete on table public.resources to authenticated;

drop policy if exists "Lecture publique des ressources IGAF" on public.resources;
create policy "Lecture publique des ressources IGAF"
on public.resources for select
to anon, authenticated
using (true);

drop policy if exists "Ajout par les administrateurs connectés" on public.resources;
create policy "Ajout par les administrateurs connectés"
on public.resources for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'igaf@l2.com');

drop policy if exists "Modification par l'administrateur IGAF" on public.resources;
create policy "Modification par l'administrateur IGAF"
on public.resources for update
to authenticated
using ((auth.jwt() ->> 'email') = 'igaf@l2.com')
with check ((auth.jwt() ->> 'email') = 'igaf@l2.com');

drop policy if exists "Suppression par les administrateurs connectés" on public.resources;
create policy "Suppression par les administrateurs connectés"
on public.resources for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'igaf@l2.com');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'igaf-library',
  'igaf-library',
  true,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Lecture publique bibliothèque IGAF" on storage.objects;
create policy "Lecture publique bibliothèque IGAF"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'igaf-library');

drop policy if exists "Dépôt administrateur bibliothèque IGAF" on storage.objects;
create policy "Dépôt administrateur bibliothèque IGAF"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'igaf-library'
  and (auth.jwt() ->> 'email') = 'igaf@l2.com'
);

drop policy if exists "Modification administrateur bibliothèque IGAF" on storage.objects;
create policy "Modification administrateur bibliothèque IGAF"
on storage.objects for update
to authenticated
using (
  bucket_id = 'igaf-library'
  and (auth.jwt() ->> 'email') = 'igaf@l2.com'
)
with check (
  bucket_id = 'igaf-library'
  and (auth.jwt() ->> 'email') = 'igaf@l2.com'
);

drop policy if exists "Suppression administrateur bibliothèque IGAF" on storage.objects;
create policy "Suppression administrateur bibliothèque IGAF"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'igaf-library'
  and (auth.jwt() ->> 'email') = 'igaf@l2.com'
);
