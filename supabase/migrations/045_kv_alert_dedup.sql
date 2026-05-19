CREATE TABLE IF NOT EXISTS public.kv_alert_dedup (
  key TEXT PRIMARY KEY,
  last_fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suppressed_count INTEGER NOT NULL DEFAULT 0
);

-- RLS on — service role only (no user access needed)
ALTER TABLE public.kv_alert_dedup ENABLE ROW LEVEL SECURITY;
