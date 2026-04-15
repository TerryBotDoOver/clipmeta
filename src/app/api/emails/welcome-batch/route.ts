/**
 * POST /api/emails/welcome-batch
 * 
 * Scans all users who have NOT received a welcome email yet (no drip_log entry 
 * with email_key='welcome') and sends them the welcome email.
 * 
 * Called by cron job. Auth: Bearer clipmeta-drip-2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';
import { welcomeEmail } from '@/lib/emails';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { applyUnsubscribe, listUnsubscribeHeaders } from '@/lib/unsubscribe';

const FROM = process.env.RESEND_FROM || 'ClipMeta <hello@clipmeta.app>';
const DRIP_SECRET = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token !== DRIP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all auth users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError || !users) {
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    // Get all user IDs that already have a welcome email logged
    const { data: alreadySent } = await supabaseAdmin
      .from('drip_log')
      .select('user_id')
      .eq('email_key', 'welcome');

    const alreadySentIds = new Set((alreadySent || []).map((r: { user_id: string }) => r.user_id));

    // Batch-load unsubscribed user IDs so we can skip them.
    const { data: unsubRows } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .not('unsubscribed_at', 'is', null);
    const unsubscribedIds = new Set((unsubRows || []).map((r: { id: string }) => r.id));

    // Filter to users who:
    // 1. Haven't received welcome email yet (not in drip_log)
    // 2. Signed up within the last 48 hours (don't blast old users who missed their window)
    // 3. Have not unsubscribed from marketing email
    // This prevents a mass email blast when the cron system restarts after being down.
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const pending = users.filter(u => {
      if (!u.email) return false;
      if (alreadySentIds.has(u.id)) return false;
      if (unsubscribedIds.has(u.id)) return false;
      const createdAt = new Date(u.created_at);
      if (createdAt < cutoff) return false;
      return true;
    });

    const results: { email: string; status: 'sent' | 'failed'; error?: string }[] = [];

    for (const user of pending) {
      const email = user.email!;
      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        email.split('@')[0];

      // Rate limit: 5 req/sec — wait 250ms between sends
      await new Promise(r => setTimeout(r, 250));

      try {
        const { subject, html } = welcomeEmail(name);
        const htmlWithUnsub = applyUnsubscribe(html, user.id);
        const { error: sendError } = await getResend().emails.send({
          from: FROM,
          to: email,
          subject,
          html: htmlWithUnsub,
          headers: listUnsubscribeHeaders(user.id),
        });

        if (sendError) throw new Error(sendError.message);

        // Log to drip_log
        await supabaseAdmin.from('drip_log').insert({
          user_id: user.id,
          email_key: 'welcome',
          sent_at: new Date().toISOString(),
        });

        results.push({ email, status: 'sent' });
      } catch (err) {
        results.push({ email, status: 'failed', error: String(err) });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      processed: pending.length,
      sent,
      failed,
      results,
    });
  } catch (err) {
    console.error('[welcome-batch] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
