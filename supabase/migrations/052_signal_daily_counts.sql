-- AIR-2138: User-signals count tracking
-- Tracks per-signal-type daily event counts and fires Paperclip threshold webhooks
-- at 20 and 50 hits/day. Service role only — no user policies.

CREATE TABLE public.signal_daily_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_type TEXT NOT NULL,
  signal_name TEXT NOT NULL,
  signal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  webhook_fired_at_thresholds INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (signal_type, signal_date)
);

ALTER TABLE public.signal_daily_counts ENABLE ROW LEVEL SECURITY;
-- Service role only — no user policies needed

-- Atomic increment function called by lib/signal-tracker.ts.
-- Returns the new count and the thresholds already fired for this row
-- so the caller can decide whether to fire the Paperclip webhook.
CREATE OR REPLACE FUNCTION public.increment_signal_count(
  p_signal_type TEXT,
  p_signal_name TEXT
) RETURNS TABLE(new_count INTEGER, fired_thresholds INTEGER[])
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.signal_daily_counts (signal_type, signal_name, count)
  VALUES (p_signal_type, p_signal_name, 1)
  ON CONFLICT (signal_type, signal_date)
  DO UPDATE SET
    count = signal_daily_counts.count + 1,
    updated_at = NOW();

  RETURN QUERY
  SELECT sdc.count AS new_count, sdc.webhook_fired_at_thresholds AS fired_thresholds
  FROM public.signal_daily_counts sdc
  WHERE sdc.signal_type = p_signal_type AND sdc.signal_date = CURRENT_DATE;
END;
$$;
