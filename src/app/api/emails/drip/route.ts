import { NextRequest, NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';
import { applyUnsubscribe, listUnsubscribeHeaders } from '@/lib/unsubscribe';
import {
  quickWinUploadedEmail,
  quickWinNoUploadEmail,
  platformExportEmail,
  socialProofEmail,
  limitNudgeEmail,
  founderNoteEmail,
  urgencyEmail,
  lastChanceEmail,
  winBackEmail,
  breakupEmail,
} from '@/lib/emails';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DRIP_SECRET = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();
const FROM = process.env.RESEND_FROM || 'ClipMeta <hello@clipmeta.app>';

type DripKey =
  | 'quickWin'
  | 'platformExport'
  | 'socialProof'
  | 'limitNudge'
  | 'founderNote'
  | 'urgency'
  | 'lastChance'
  | 'winBack'
  | 'breakup';

const DRIP_SCHEDULE: { key: DripKey; days: number }[] = [
  { key: 'quickWin',      days: 1  },
  { key: 'platformExport', days: 3 },
  { key: 'socialProof',   days: 5  },
  { key: 'limitNudge',    days: 7  },
  { key: 'founderNote',   days: 10 },
  { key: 'urgency',       days: 14 },
  { key: 'lastChance',    days: 16 },
  { key: 'winBack',       days: 21 },
  { key: 'breakup',       days: 30 },
];

function daysSince(date: string): number {
  const created = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

async function getUserClipCount(userId: string, sinceDate?: string): Promise<number> {
  let query = supabaseAdmin
    .from('clips')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (sinceDate) {
    query = query.gte('created_at', sinceDate);
  }

  const { count } = await query;
  return count ?? 0;
}

async function isUserPaid(userId: string): Promise<boolean> {
  // Check profiles plan + drip_track
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan, drip_track')
    .eq('id', userId)
    .maybeSingle();

  // Primary guard: user is on the paid drip track → Track 1 never touches them
  if (profile?.drip_track === 'paid') return true;

  if (profile?.plan && profile.plan !== 'free') return true;

  // Try subscriptions table (may not exist)
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();
    if (sub) return true;
  } catch {
    // Table doesn't exist, ignore
  }

  return false;
}

async function getEmailForKey(
  key: DripKey,
  name: string,
  userId: string
): Promise<{ subject: string; html: string }> {
  switch (key) {
    case 'quickWin': {
      const count = await getUserClipCount(userId);
      return count > 0
        ? quickWinUploadedEmail(name)
        : quickWinNoUploadEmail(name);
    }
    case 'platformExport':
      return platformExportEmail(name);
    case 'socialProof':
      return socialProofEmail(name);
    case 'limitNudge': {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const count = await getUserClipCount(userId, sevenDaysAgo);
      return limitNudgeEmail(name, count);
    }
    case 'founderNote':
      return founderNoteEmail(name);
    case 'urgency':
      return urgencyEmail(name);
    case 'lastChance':
      return lastChanceEmail(name);
    case 'winBack':
      return winBackEmail(name);
    case 'breakup':
      return breakupEmail(name);
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (token !== DRIP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      console.error('[drip] Failed to list users:', usersError);
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    const users = usersData.users;
    const results: { userId: string; email: string; sent: DripKey[]; skipped: DripKey[] }[] = [];

    // Batch-load all unsubscribed user IDs so we can skip them without a per-user query.
    const { data: unsubRows } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .not('unsubscribed_at', 'is', null);
    const unsubscribedIds = new Set((unsubRows || []).map((r: { id: string }) => r.id));

    for (const user of users) {
      if (!user.email || !user.created_at) continue;

      // Skip users who have opted out of marketing email.
      if (unsubscribedIds.has(user.id)) continue;

      // Skip paid users
      const paid = await isUserPaid(user.id);
      if (paid) continue;

      const days = daysSince(user.created_at);
      const name = (
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split('@')[0]
      ) as string;

      // Get already-sent drip emails for this user
      const { data: sentLogs } = await supabaseAdmin
        .from('drip_log')
        .select('email_key')
        .eq('user_id', user.id);

      const alreadySent = new Set((sentLogs || []).map((l: { email_key: string }) => l.email_key));

      const sent: DripKey[] = [];
      const skipped: DripKey[] = [];

      for (const { key, days: targetDays } of DRIP_SCHEDULE) {
        if (days < targetDays || alreadySent.has(key)) {
          skipped.push(key);
          continue;
        }

        const { subject, html } = await getEmailForKey(key, name, user.id);
        const htmlWithUnsub = applyUnsubscribe(html, user.id);

        const { error: sendError } = await getResend().emails.send({
          from: FROM,
          to: user.email,
          subject,
          html: htmlWithUnsub,
          headers: listUnsubscribeHeaders(user.id),
        });

        if (sendError) {
          console.error(`[drip] Failed to send ${key} to ${user.email}:`, sendError);
          skipped.push(key);
          continue;
        }

        await supabaseAdmin.from('drip_log').insert({
          user_id: user.id,
          email_key: key,
          sent_at: new Date().toISOString(),
        });

        sent.push(key);
      }

      if (sent.length > 0) {
        results.push({ userId: user.id, email: user.email, sent, skipped });
      }
    }

    return NextResponse.json({
      success: true,
      processed: users.length,
      emailsSent: results.reduce((acc, r) => acc + r.sent.length, 0),
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('[drip] Unexpected error:', msg, stack);
    return NextResponse.json({ error: msg, stack: stack?.slice(0, 300) }, { status: 500 });
  }
}
