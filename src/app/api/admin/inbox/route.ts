import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getResend } from '@/lib/resend';

const DRIP_SECRET = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${DRIP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: emails } = await supabaseAdmin
    .from('inbound_emails')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ emails: emails || [] });
}

// Reply to an email
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${DRIP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { emailId, replyText } = await req.json();
  if (!emailId || !replyText) {
    return NextResponse.json({ error: 'emailId and replyText required' }, { status: 400 });
  }

  // Get the original email
  const { data: email } = await supabaseAdmin
    .from('inbound_emails')
    .select('*')
    .eq('id', emailId)
    .single();

  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  // Send reply via Resend
  const resend = getResend();
  const { error: sendError } = await resend.emails.send({
    from: 'ClipMeta <hello@clipmeta.app>',
    to: email.from_address,
    subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.7;color:#333;">${replyText.replace(/\n/g, '<br>')}</div>`,
  });

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 500 });
  }

  // Mark as replied
  await supabaseAdmin
    .from('inbound_emails')
    .update({ status: 'replied', replied_at: new Date().toISOString(), reply_text: replyText })
    .eq('id', emailId);

  return NextResponse.json({ success: true });
}

// Mark as read
export async function PATCH(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${DRIP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { emailId, status } = await req.json();
  await supabaseAdmin
    .from('inbound_emails')
    .update({ status })
    .eq('id', emailId);

  return NextResponse.json({ success: true });
}
