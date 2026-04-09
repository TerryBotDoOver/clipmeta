import { NextRequest, NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';
import { welcomeEmail } from '@/lib/emails';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const FROM = process.env.RESEND_FROM || 'ClipMeta <hello@clipmeta.app>';
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || '';

async function sendWelcomeAndLog(email: string, name: string, userId?: string) {
  const { subject, html } = welcomeEmail(name);

  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: email,
    subject,
    html,
  });

  if (error) {
    console.error('[welcome email] Resend error:', error);
    throw new Error(error.message);
  }

  // Log to drip_log so drip sequence knows welcome was sent
  if (userId) {
    await supabaseAdmin.from('drip_log').insert({
      user_id: userId,
      email_key: 'welcome',
      sent_at: new Date().toISOString(),
    });
  }

  return data?.id;
}

// ─── Standard POST (called from frontend after signup) ──────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Detect Supabase auth webhook payload (has "type" and "record" fields)
    if (body.type === 'INSERT' && body.table === 'users' && body.record) {
      return handleWebhook(body.record);
    }

    // Standard frontend call: { email, name }
    const { email, name, userId } = body as { email: string; name?: string; userId?: string };

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const id = await sendWelcomeAndLog(email, name || 'there', userId);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('[welcome email] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Supabase Auth Webhook handler ──────────────────────────────────────────

async function handleWebhook(record: {
  id?: string;
  email?: string;
  created_at?: string;
  raw_user_meta_data?: Record<string, string>;
}) {
  const userId = record.id;
  const email = record.email;
  const createdAt = record.created_at;

  if (!email || !userId) {
    return NextResponse.json({ error: 'Missing email or userId in webhook payload' }, { status: 400 });
  }

  // Only process brand-new users (created within last 5 minutes)
  if (createdAt) {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    if (ageMs > 5 * 60 * 1000) {
      return NextResponse.json({ skipped: true, reason: 'User is not brand new' });
    }
  }

  // Check if welcome was already sent (idempotency)
  const { data: existing } = await supabaseAdmin
    .from('drip_log')
    .select('id')
    .eq('user_id', userId)
    .eq('email_key', 'welcome')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'Welcome already sent' });
  }

  const name =
    record.raw_user_meta_data?.full_name ||
    record.raw_user_meta_data?.name ||
    email.split('@')[0];

  const id = await sendWelcomeAndLog(email, name, userId);
  return NextResponse.json({ success: true, id });
}
