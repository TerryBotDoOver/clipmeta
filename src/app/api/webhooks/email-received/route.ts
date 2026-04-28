import { NextRequest, NextResponse } from 'next/server';
import { draftCustomerEmail } from '@/lib/customerEmailDraft';
import { DISCORD_CHANNELS, sendDiscordMessage } from '@/lib/discord';
import { emailApprovalUrl, emailReviseUrl } from '@/lib/emailApproval';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildSupportResearchContext } from '@/lib/supportResearchContext';

function normalizeEmailAddress(value: unknown) {
  if (typeof value !== 'string') return '';
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim().toLowerCase();
}

function isClipMetaGeneratedEmail(from: unknown, subject: unknown) {
  const fromAddress = normalizeEmailAddress(from);
  const resendFrom = normalizeEmailAddress(process.env.RESEND_FROM || 'ClipMeta <hello@clipmeta.app>');
  const subjectText = typeof subject === 'string' ? subject : '';

  return (
    fromAddress === 'hello@clipmeta.app' ||
    fromAddress === resendFrom ||
    /^we received your support request/i.test(subjectText)
  );
}

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    if (event.type === 'email.received') {
      const svixId = req.headers.get('svix-id') || '';
      const { email_id, message_id, from, to, subject, created_at, attachments } = event.data || {};
      const dedupeId = email_id || svixId || message_id || '';

      if (!dedupeId) {
        console.warn('[webhook] email.received missing id; acknowledged without side effects');
        return NextResponse.json({ received: true, skipped: 'missing_id' });
      }

      if (isClipMetaGeneratedEmail(from, subject)) {
        console.log('[webhook] Ignored ClipMeta-generated inbound email:', dedupeId);
        return NextResponse.json({ received: true, skipped: 'clipmeta_generated' });
      }

      const { data: existingEmail, error: existingError } = await supabaseAdmin
        .from('inbound_emails')
        .select('id')
        .eq('resend_email_id', dedupeId)
        .maybeSingle();

      if (existingError) {
        console.error('[webhook] Supabase duplicate check error:', existingError);
      }

      if (existingEmail) {
        console.log('[webhook] Duplicate email.received ignored:', dedupeId);
        return NextResponse.json({ received: true, duplicate: true });
      }

      let body = '';
      let htmlBody = '';
      const resendKey = (process.env.RESEND_API_KEY || '').trim();

      if (email_id && resendKey) {
        try {
          const emailRes = await fetch(`https://api.resend.com/emails/${email_id}/content`, {
            headers: { Authorization: `Bearer ${resendKey}` },
          });

          if (emailRes.ok) {
            const emailData = await emailRes.json();
            body = emailData.text || '';
            htmlBody = emailData.html || '';
            console.log('[webhook] Fetched email body, text length:', body.length, 'html length:', htmlBody.length);
          } else {
            console.log('[webhook] Could not fetch email body, status:', emailRes.status);
            const fallbackRes = await fetch(`https://api.resend.com/emails/receiving/${email_id}`, {
              headers: { Authorization: `Bearer ${resendKey}` },
            });

            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              body = fallbackData.text || '';
              htmlBody = fallbackData.html || '';
              console.log('[webhook] Fetched via fallback, text length:', body.length);
            }
          }
        } catch (e) {
          console.error('[webhook] Failed to fetch email content:', e);
        }
      }

      const { data: insertedEmail, error: insertError } = await supabaseAdmin
        .from('inbound_emails')
        .insert({
          resend_email_id: dedupeId,
          from_address: from,
          to_address: Array.isArray(to) ? to.join(', ') : to,
          subject: subject || '(no subject)',
          body_text: body,
          body_html: htmlBody,
          attachments: attachments || [],
          received_at: created_at || new Date().toISOString(),
          status: 'unread',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[webhook] Supabase insert error:', insertError);
        return NextResponse.json({ error: 'Failed to store inbound email' }, { status: 500 });
      }

      const preview = body?.slice(0, 500).trim() || '(no text preview available)';

      const inboxDiscord = await sendDiscordMessage({
        channelId: DISCORD_CHANNELS.inbox,
        content: [
          '**New ClipMeta customer email**',
          `From: ${from}`,
          `To: ${Array.isArray(to) ? to.join(', ') : to || '(unknown)'}`,
          `Subject: ${subject || '(no subject)'}`,
          '',
          `Preview: ${preview}`,
        ].join('\n'),
      });
      if (!inboxDiscord.ok) {
        console.error('[webhook] Inbox Discord notification failed:', inboxDiscord);
      }

      const emailDbId = insertedEmail?.id;
      if (emailDbId) {
        try {
          const accountContext = await buildSupportResearchContext({
            from,
            subject: subject || '(no subject)',
            body: body || htmlBody || '',
            currentEmailId: emailDbId,
          });
          const draft = await draftCustomerEmail({
            from,
            subject: subject || '(no subject)',
            body: body || htmlBody || '',
            accountContext,
          });

          await supabaseAdmin
            .from('inbound_emails')
            .update({
              status: 'pending_approval',
              reply_text: draft,
            })
            .eq('id', emailDbId);

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clipmeta.app';
          const approvalDiscord = await sendDiscordMessage({
            channelId: DISCORD_CHANNELS.emailApprovals,
            content: [
              '**Draft reply waiting for approval**',
              `From: ${from}`,
              `Subject: ${subject || '(no subject)'}`,
              '',
              draft,
              '',
              `Approve and send: ${emailApprovalUrl(baseUrl, emailDbId, 'send')}`,
              `Discard draft: ${emailApprovalUrl(baseUrl, emailDbId, 'discard')}`,
              `Revise draft: ${emailReviseUrl(baseUrl, emailDbId)}`,
            ].join('\n'),
          });
          if (!approvalDiscord.ok) {
            console.error('[webhook] Approval Discord notification failed:', approvalDiscord);
          }
        } catch (e) {
          console.error('[webhook] Draft/approval notification failed:', e);
          const manualDiscord = await sendDiscordMessage({
            channelId: DISCORD_CHANNELS.emailApprovals,
            content: [
              '**New email needs manual reply**',
              `From: ${from}`,
              `Subject: ${subject || '(no subject)'}`,
              `Email ID: ${emailDbId}`,
              '',
              'Draft generation failed. Check the inbox before replying.',
            ].join('\n'),
          });
          if (!manualDiscord.ok) {
            console.error('[webhook] Manual reply Discord notification failed:', manualDiscord);
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ ignored: true });
  } catch (err: unknown) {
    console.error('[webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
