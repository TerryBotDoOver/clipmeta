CREATE TABLE IF NOT EXISTS inbound_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resend_email_id text,
  from_address text NOT NULL,
  to_address text,
  subject text,
  body_text text,
  body_html text,
  attachments jsonb DEFAULT '[]',
  received_at timestamptz DEFAULT now(),
  status text DEFAULT 'unread',
  replied_at timestamptz,
  reply_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON inbound_emails FOR ALL USING (false);
CREATE INDEX idx_inbound_emails_status ON inbound_emails(status);
CREATE INDEX idx_inbound_emails_received ON inbound_emails(received_at DESC);
