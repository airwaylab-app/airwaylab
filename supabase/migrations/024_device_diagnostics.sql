-- Device diagnostics: stores unknown device info when settings extraction fails.
-- Used to reverse-engineer support for new PAP device types.
CREATE TABLE IF NOT EXISTS device_diagnostics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_model TEXT NOT NULL DEFAULT 'Unknown',
  signal_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  identification_text TEXT,
  has_str_file BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: service role only (no user access)
ALTER TABLE device_diagnostics ENABLE ROW LEVEL SECURITY;

-- No public policies — only service role can insert/read
