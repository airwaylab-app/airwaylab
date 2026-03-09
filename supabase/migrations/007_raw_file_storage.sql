-- ============================================================
-- AirwayLab — Raw File Storage
-- Stores raw SD card files (EDF, CSV, etc.) for authenticated users
-- who consent to cloud storage. Enables waveform replay without
-- re-uploading and future format compatibility research.
-- ============================================================

-- Storage bucket for user files (created via Supabase dashboard or CLI)
-- Name: user-files, Private, 50MB max file size
-- RLS on storage.objects is configured below.

-- ─── File metadata table ────────────────────────────────────

create table if not exists public.user_files (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  night_date    date,                              -- null for shared files (STR.edf, Identification)
  file_path     text not null,                     -- original relative path from SD card root
  storage_path  text not null,                     -- path in Supabase Storage bucket
  file_name     text not null,
  file_size     bigint not null,
  file_hash     text not null,                     -- SHA-256 hex for dedup/integrity
  mime_type     text,
  is_supported  boolean not null default true,     -- false for unknown/future formats
  uploaded_at   timestamptz not null default now(),
  unique (user_id, storage_path)
);

-- Indexes
create index if not exists idx_user_files_user_id on public.user_files(user_id);
create index if not exists idx_user_files_user_night on public.user_files(user_id, night_date);
create index if not exists idx_user_files_hash on public.user_files(user_id, file_hash);

-- RLS
alter table public.user_files enable row level security;

create policy "Users can read their own files"
  on public.user_files for select
  using (auth.uid() = user_id);

create policy "Users can insert their own files"
  on public.user_files for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own files"
  on public.user_files for delete
  using (auth.uid() = user_id);

create policy "Service role full access on user_files"
  on public.user_files for all
  using (auth.role() = 'service_role');

-- ─── Storage usage tracking ─────────────────────────────────

create table if not exists public.user_storage_usage (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  total_bytes   bigint not null default 0,
  file_count    int not null default 0,
  updated_at    timestamptz not null default now()
);

alter table public.user_storage_usage enable row level security;

create policy "Users can read their own storage usage"
  on public.user_storage_usage for select
  using (auth.uid() = user_id);

create policy "Service role full access on user_storage_usage"
  on public.user_storage_usage for all
  using (auth.role() = 'service_role');

-- ─── Trigger: auto-update storage usage on file insert/delete ──

create or replace function public.update_storage_usage()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_storage_usage (user_id, total_bytes, file_count, updated_at)
    values (new.user_id, new.file_size, 1, now())
    on conflict (user_id) do update set
      total_bytes = user_storage_usage.total_bytes + new.file_size,
      file_count = user_storage_usage.file_count + 1,
      updated_at = now();
    return new;
  elsif tg_op = 'DELETE' then
    update public.user_storage_usage set
      total_bytes = greatest(0, total_bytes - old.file_size),
      file_count = greatest(0, file_count - 1),
      updated_at = now()
    where user_id = old.user_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_user_files_usage
  after insert or delete on public.user_files
  for each row execute function public.update_storage_usage();

-- ─── Storage consent tracking ───────────────────────────────
-- Added to profiles table rather than a new table

alter table public.profiles
  add column if not exists storage_consent boolean not null default false,
  add column if not exists storage_consent_at timestamptz;
