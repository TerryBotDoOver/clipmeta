import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    if (event.type === 'email.received') {
      const { email_id, from, to, subject, created_at, attachments } = event.data;

      // Resend webhooks DON'T include the body — must fetch via API
      let body = '';
      let htmlBody = '';
      const resendKey = (process.env.RESEND_API_KEY || '').trim();
      
      if (email_id && resendKey) {
        try {
          // Fetch email content from Resend's RECEIVING API (different from outbound)
          // Endpoint: GET /emails/{id}/content — for received emails
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
            // Fallback: try the receiving SDK-style endpoint
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

      // Store in Supabase
      const { error: insertError } = await supabaseAdmin.from('inbound_emails').insert({
        resend_email_id: email_id,
        from_address: from,
        to_address: Array.isArray(to) ? to.join(', ') : to,
        subject: subject || '(no subject)',
        body_text: body,
        body_html: htmlBody,
        attachments: attachments || [],
        received_at: created_at || new Date().toISOString(),
        status: 'unread',
      });

      if (insertError) {
        console.error('[webhook] Supabase insert error:', insertError);
      }

      // Send Discord notification
      const discordToken = process.env.DISCORD_BOT_TOKEN;
      if (discordToken) {
        const channelId = '1485454655524962495'; // #inbox channel under CLIPMETA
        try {
          await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${discordToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: `📧 **New email received at hello@clipmeta.app**\n**From:** ${from}\n**Subject:** ${subject || '(no subject)'}\n**Preview:** ${body?.slice(0, 200) || '(no preview)'}`,
            }),
          });
        } catch (e) {
          console.error('[webhook] Discord notification failed:', e);
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
