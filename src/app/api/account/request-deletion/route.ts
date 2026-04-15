import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getResend } from '@/lib/resend';

const FROM = process.env.RESEND_FROM || 'ClipMeta <hello@clipmeta.app>';
const NOTIFY_TO = process.env.SUPPORT_INBOX || 'hello@clipmeta.app';

const VALID_REASONS = new Set([
  'too_expensive',
  'not_enough_features',
  'switching_to_competitor',
  'not_using_enough',
  'privacy',
  'other',
]);

const REASON_LABELS: Record<string, string> = {
  too_expensive: 'Too expensive',
  not_enough_features: 'Missing features I need',
  switching_to_competitor: 'Switching to a competitor',
  not_using_enough: 'Not using it enough',
  privacy: 'Privacy concerns',
  other: 'Other',
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reason_category, reason_text } = await req.json();

    if (typeof reason_category !== 'string' || !VALID_REASONS.has(reason_category)) {
      return NextResponse.json({ error: 'Invalid reason_category' }, { status: 400 });
    }
    const freeText = typeof reason_text === 'string' ? reason_text.slice(0, 2000) : '';

    // Insert the request. Only one pending request per user at a time.
    const { data: existing } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('id')
      .eq('user_id', user.id)
      .is('processed_at', null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        already_pending: true,
        message: "Your deletion request is already on file. Terry will reach out shortly.",
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        reason_category,
        reason_text: freeText,
      });

    if (insertError) {
      console.error('[request-deletion] insert failed:', insertError);
      return NextResponse.json({ error: 'Failed to record request' }, { status: 500 });
    }

    // Fetch a bit of context for the notification email.
    const [{ count: clipCount }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from('clip_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', 'created'),
      supabaseAdmin
        .from('profiles')
        .select('plan, stripe_subscription_status')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    // Notify Levi via the support inbox. Non-fatal if it fails.
    try {
      await getResend().emails.send({
        from: FROM,
        to: NOTIFY_TO,
        replyTo: user.email ?? undefined,
        subject: `[Deletion request] ${user.email}`,
        text: [
          `Account deletion request`,
          ``,
          `Email:    ${user.email}`,
          `User ID:  ${user.id}`,
          `Plan:     ${profile?.plan || 'free'} (${profile?.stripe_subscription_status || 'no subscription'})`,
          `Clips uploaded: ${clipCount ?? 0}`,
          ``,
          `Reason:   ${REASON_LABELS[reason_category] || reason_category}`,
          ``,
          freeText ? `Additional notes:\n${freeText}` : `(no additional notes)`,
          ``,
          `----`,
          `Delete command (run from Mission Control or a dev shell):`,
          `curl -X POST "https://clipmeta.app/api/admin/delete-user" -H "Authorization: Bearer \${DRIP_SECRET}" -H "Content-Type: application/json" -d '{"email":"${user.email}"}'`,
        ].join('\n'),
      });
    } catch (mailErr) {
      console.error('[request-deletion] notification email failed:', mailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[request-deletion] unexpected:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
