import { NextRequest, NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';
import { applyUnsubscribe, listUnsubscribeHeaders } from '@/lib/unsubscribe';
import {
  paidDay0Email,
  paidDay2Email,
  paidDay5Email,
  paidDay6TrialEmail,
  paidDay8Email,
  paidDay21Email,
  paidDay50Email,
} from '@/lib/emails';
import { supabaseAdmin } from '@/lib/supabase-admin';

const DRIP_SECRET = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();
const FROM = process.env.RESEND_FROM || 'ClipMeta <hello@clipmeta.app>';

type PaidDripKey =
  | 'paid_day0'
  | 'paid_day2'
  | 'paid_day5'
  | 'paid_day6_trial'
  | 'paid_day8'
  | 'paid_day21'
  | 'paid_day50';

// Pruned 2026-04-27 per Levi: dropped `paid_day5` ("Quick check-in") and
// `paid_day8` ("Quick question -- which platforms"). Both were content-light
// feedback pings that overlapped with `paid_day21` ("How's it going"). Three
// feedback asks in three weeks was creating fatigue; one mid-cycle ask is
// enough. Functions still live in emails.ts in case we want them back.
const PAID_SCHEDULE: { key: PaidDripKey; days: number; trialOnly?: boolean }[] = [
  { key: 'paid_day0',       days: 0  },
  { key: 'paid_day2',       days: 2  },
  { key: 'paid_day6_trial', days: 6,  trialOnly: true },
  { key: 'paid_day21',      days: 21 },
  { key: 'paid_day50',      days: 50 },
];

function daysSince(date: string): number {
  const d = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getClipCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('clips')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

async function buildEmail(
  key: PaidDripKey,
  name: string,
  plan: string,
  userId: string,
): Promise<{ subject: string; html: string }> {
  switch (key) {
    case 'paid_day0':       return paidDay0Email(name, plan);
    case 'paid_day2':       return paidDay2Email(name);
    case 'paid_day5':       return paidDay5Email(name);
    case 'paid_day6_trial': return paidDay6TrialEmail(name);
    case 'paid_day8':       return paidDay8Email(name);
    case 'paid_day21':      return paidDay21Email(name);
    case 'paid_day50': {
      const clipCount = await getClipCount(userId);
      return paidDay50Email(name, clipCount);
    }
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (token !== DRIP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Load all paid-track profiles that are active/trialing/founder and not unsubscribed.
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, plan, stripe_subscription_status, drip_track_switched_at')
      .eq('drip_track', 'paid')
      .in('stripe_subscription_status', ['trialing', 'active', 'founder'])
      .is('unsubscribed_at', null);

    if (profilesError) {
      console.error('[drip-paid] Failed to fetch profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    let processed = 0;
    let sent = 0;
    let skipped = 0;

    for (const profile of profiles ?? []) {
      processed++;

      // Can't schedule without a switch timestamp
      if (!profile.drip_track_switched_at) {
        skipped++;
        continue;
      }

      // Fetch auth user for email address + display name
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (authError || !authData?.user?.email) {
        console.error(`[drip-paid] Could not fetch auth user ${profile.id}:`, authError);
        skipped++;
        continue;
      }

      const user = authData.user;
      const email = user.email!;
      const name = (
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split('@')[0]
      ) as string;

      const daysSinceSwitch = daysSince(profile.drip_track_switched_at as string);
      const isTrial = profile.stripe_subscription_status === 'trialing';

      // Load all paid drip emails already sent to this user
      const { data: sentLogs } = await supabaseAdmin
        .from('drip_log')
        .select('email_key')
        .eq('user_id', profile.id)
        .like('email_key', 'paid_%');

      const alreadySent = new Set(
        (sentLogs ?? []).map((l: { email_key: string }) => l.email_key),
      );

      for (const { key, days, trialOnly } of PAID_SCHEDULE) {
        // Not due yet
        if (daysSinceSwitch < days) {
          skipped++;
          continue;
        }

        // Trial-only — skip for non-trialing users
        if (trialOnly && !isTrial) {
          skipped++;
          continue;
        }

        // Already sent (idempotency guard)
        if (alreadySent.has(key)) {
          skipped++;
          continue;
        }

        const { subject, html } = await buildEmail(key, name, profile.plan, profile.id);
        const htmlWithUnsub = applyUnsubscribe(html, profile.id);

        const { error: sendError } = await getResend().emails.send({
          from: FROM,
          to: email,
          subject,
          html: htmlWithUnsub,
          headers: listUnsubscribeHeaders(profile.id),
        });

        if (sendError) {
          console.error(`[drip-paid] Send failed: ${key} → ${email}:`, sendError);
          skipped++;
          continue;
        }

        // Log before moving on so a crash mid-loop never causes duplicates on retry
        await supabaseAdmin.from('drip_log').insert({
          user_id: profile.id,
          email_key: key,
          sent_at: new Date().toISOString(),
        });

        alreadySent.add(key); // guard against double-send within this same run
        sent++;

        // Rate limit: 250ms between sends
        await sleep(250);
      }
    }

    return NextResponse.json({ processed, sent, skipped });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[drip-paid] Unexpected error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
