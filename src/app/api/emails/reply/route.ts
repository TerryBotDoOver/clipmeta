import { NextRequest, NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const DRIP_SECRET = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();
const FROM = 'ClipMeta <hello@clipmeta.app>';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${DRIP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { emailId, text } = await req.json();

  if (!emailId) {
    return NextResponse.json({ error: 'emailId is required for replies to inbound email' }, { status: 400 });
  }

  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    const { data: email, error: emailError } = await supabaseAdmin
      .from('inbound_emails')
      .select('id, from_address, subject, status')
      .eq('id', emailId)
      .maybeSingle();

    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (email.status === 'replied') {
      return NextResponse.json({ error: 'Email has already been replied to' }, { status: 409 });
    }

    const to = typeof email.from_address === 'string' ? email.from_address.trim() : '';
    if (!to) {
      return NextResponse.json({ error: 'Inbound email is missing a reply address' }, { status: 422 });
    }

    const storedSubject = typeof email.subject === 'string' && email.subject.trim()
      ? email.subject.trim()
      : '(no subject)';
    const subject = /^re:/i.test(storedSubject) ? storedSubject : `Re: ${storedSubject}`;

    const resend = getResend();
    const { data: result, error: sendError } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      text,
    });

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('inbound_emails')
      .update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        reply_text: text,
      })
      .eq('id', emailId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result,
      recipientSource: 'inbound_emails.from_address',
      subjectSource: 'inbound_emails.subject',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
