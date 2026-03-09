-- ============================================================
-- Migration 008: Security fixes
-- 1. Fix update_storage_usage() trigger missing search_path
-- 2. Add service-role policy to account_deletion_requests
-- ============================================================

-- Fix: update_storage_usage trigger needs search_path = '' (same fix as 006)
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
$$ language plpgsql security definer set search_path = '';

-- Add service-role full access to account_deletion_requests
-- (needed for admin processing of deletion requests)
create policy "Service role full access"
  on public.account_deletion_requests for all
  using (auth.role() = 'service_role');
