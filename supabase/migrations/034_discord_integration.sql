-- Discord community integration
-- Adds Discord linking columns to profiles and creates
-- pending role queue + role event audit tables.

-- Discord linking columns on profiles
ALTER TABLE profiles ADD COLUMN discord_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN discord_username TEXT;
ALTER TABLE profiles ADD COLUMN discord_linked_at TIMESTAMPTZ;

-- Index for webhook lookups (find discord_id by user_id)
CREATE INDEX idx_profiles_discord_id ON profiles(discord_id) WHERE discord_id IS NOT NULL;

-- Pending role queue: users who subscribe before connecting Discord
CREATE TABLE discord_pending_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);
ALTER TABLE discord_pending_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pending roles"
  ON discord_pending_roles FOR SELECT
  USING (user_id = auth.uid());

-- Audit log for Discord role changes
CREATE TABLE discord_role_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discord_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('assign', 'revoke')),
  reason TEXT NOT NULL,
  stripe_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE discord_role_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own role events"
  ON discord_role_events FOR SELECT
  USING (user_id = auth.uid());
