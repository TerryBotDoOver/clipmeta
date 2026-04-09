CREATE TABLE IF NOT EXISTS drip_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  email_key text NOT NULL, -- 'welcome', 'day3', 'day7', 'day14'
  sent_at timestamptz DEFAULT now(),
  UNIQUE(user_id, email_key)
);

ALTER TABLE drip_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON drip_log FOR ALL USING (false);
