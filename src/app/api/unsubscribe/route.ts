import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

const HTML_WRAPPER = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:80px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="color:#fafafa;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Clip<span style="color:#8b5cf6;">Meta</span></span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#18181b;border-radius:12px;padding:40px 36px;text-align:center;">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const SUCCESS_HTML = HTML_WRAPPER(
  'Unsubscribed from ClipMeta',
  `
    <h1 style="color:#fafafa;font-size:22px;font-weight:700;margin:0 0 16px 0;">You have been unsubscribed</h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 8px 0;">We will no longer send you marketing or lifecycle emails from ClipMeta.</p>
    <p style="color:#71717a;font-size:13px;line-height:1.7;margin:16px 0 0 0;">You may still receive transactional emails such as receipts and account notifications.</p>
  `
);

const INVALID_HTML = HTML_WRAPPER(
  'Invalid unsubscribe link',
  `
    <h1 style="color:#fafafa;font-size:22px;font-weight:700;margin:0 0 16px 0;">Invalid link</h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0;">This unsubscribe link is not valid or has expired. If you continue to receive unwanted emails, reply to any ClipMeta email and we will remove you manually.</p>
  `
);

async function doUnsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  const userId = verifyUnsubscribeToken(token);
  if (!userId) return false;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[unsubscribe] update failed:', error);
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  const ok = await doUnsubscribe(token);
  return new NextResponse(ok ? SUCCESS_HTML : INVALID_HTML, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// One-click unsubscribe target for mail clients that honor RFC 8058
// (Gmail, Apple Mail). Invoked automatically from the List-Unsubscribe-Post header.
export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  const ok = await doUnsubscribe(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
