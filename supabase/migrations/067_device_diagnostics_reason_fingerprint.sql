-- ============================================================
-- 067: device_diagnostics coverage-gap columns (#1036 AutoSet harvest)
-- The analysis worker now emits a diagnostic for known coverage gaps it cannot
-- map 100%. First reason: AirSense auto-mode 'untrusted_autoset_range' — we have
-- S.C.Press but not the AutoSet min/max range signal, so the range is untrusted
-- (see #1036 / PR #1048). Storing the reason + a stable fingerprint lets the
-- coverage sweep open ONE structured GitHub issue per distinct
-- (device_model + reason + signal-label set) and recover the real signal labels
-- needed to add support.
--
-- Additive + nullable: safe while old code (which does not write these) still
-- runs — the diagnostic insert is fire-and-forget. signal_labels already exists
-- (024, jsonb). The index serves the sweep's per-fingerprint dedup lookups and
-- the route's insert-dedup check.
-- ============================================================

alter table public.device_diagnostics
  add column if not exists reason      text,
  add column if not exists fingerprint text;

create index if not exists device_diagnostics_fingerprint_idx
  on public.device_diagnostics (fingerprint);
