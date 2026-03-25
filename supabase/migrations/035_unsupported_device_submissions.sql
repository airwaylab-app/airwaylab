-- Unsupported device data submissions
-- Stores file structure metadata from users with non-supported PAP devices
-- so we can analyse formats and add support.
CREATE TABLE unsupported_device_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_structure JSONB NOT NULL,
  file_header_samples JSONB,
  device_guess TEXT,
  email TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'analyzing', 'supported', 'wont-support'))
);

ALTER TABLE unsupported_device_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON unsupported_device_submissions
  FOR ALL TO service_role USING (true);
