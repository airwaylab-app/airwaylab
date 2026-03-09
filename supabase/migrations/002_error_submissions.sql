-- Error submissions: stores info about unsupported data formats
-- so we can add support for new devices.
CREATE TABLE IF NOT EXISTS error_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_names TEXT[] NOT NULL,
  error_message TEXT NOT NULL,
  email TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only service_role can insert/read
ALTER TABLE error_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON error_submissions
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_error_submissions_created ON error_submissions(created_at);
