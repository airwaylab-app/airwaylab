CREATE TABLE webhook_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS on (read-only for service role)
ALTER TABLE webhook_dlq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON webhook_dlq
  USING (auth.role() = 'service_role');
