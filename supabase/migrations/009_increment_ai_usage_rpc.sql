-- Atomic increment for AI usage counter (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id uuid, p_month text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_usage (user_id, month, count)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET count = ai_usage.count + 1;
END;
$$;
