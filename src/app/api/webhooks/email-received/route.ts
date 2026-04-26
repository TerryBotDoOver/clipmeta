import { NextRequest, NextResponse } from 'next/server';
import { draftCustomerEmail } from '@/lib/customerEmailDraft';
import { DISCORD_CHANNELS, sendDiscordMessage } from '@/lib/discord';
import { emailApprovalUrl } from '@/lib/emailApproval';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    if (event.type === 'email.received') {
      const { email_id, from, to, subject, created_at, attachments } = event.data;

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

      if (email_id) {
        const { data: existingEmail, error: existingError } = await supabaseAdmin
          .from('inbound_emails')
          .select('id')
          .eq('resend_email_id', email_id)
          .maybeSingle();

        if (existingError) {
          console.error('[webhook] Supabase duplicate check error:', existingError);
        }

        if (existingEmail) {
          console.log('[webhook] Duplicate email.received ignored:', email_id);
          return NextResponse.json({ received: true, duplicate: true });
        }
      }

      const { data: insertedEmail, error: insertError } = await supabaseAdmin
        .from('inbound_emails')
        .insert({
          resend_email_id: email_id,
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

      await sendDiscordMessage({
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

      const emailDbId = insertedEmail?.id;
      if (emailDbId) {
        try {
          const draft = await draftCustomerEmail({
            from,
            subject: subject || '(no subject)',
            body: body || htmlBody || '',
          });

          await supabaseAdmin
            .from('inbound_emails')
            .update({
              status: 'pending_approval',
              reply_text: draft,
            })
            .eq('id', emailDbId);

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clipmeta.app';
          await sendDiscordMessage({
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
            ].join('\n'),
          });
        } catch (e) {
          console.error('[webhook] Draft/approval notification failed:', e);
          await sendDiscordMessage({
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
