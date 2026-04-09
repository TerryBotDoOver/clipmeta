import { NextRequest, NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';
import { createClient } from '@supabase/supabase-js';

const DRIP_SECRET = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();
const FROM = 'ClipMeta <hello@clipmeta.app>';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${DRIP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { emailId, to, subject, text } = await req.json();

  if (!to || !subject || !text) {
    return NextResponse.json({ error: 'to, subject, and text are required' }, { status: 400 });
  }

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject,
      text,
    });

    // Mark as replied in Supabase
    if (emailId) {
      await supabaseAdmin
        .from('inbound_emails')
        .update({
          status: 'replied',
          replied_at: new Date().toISOString(),
          reply_text: text,
        })
        .eq('id', emailId);
    }

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
