import crypto from 'crypto';

const SECRET =
  process.env.UNSUBSCRIBE_SECRET ||
  process.env.DRIP_SECRET ||
  'clipmeta-drip-2026';

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'https://clipmeta.app';

function sign(userId: string): string {
  return crypto.createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 32);
}

export function buildUnsubscribeToken(userId: string): string {
  const sig = sign(userId);
  return Buffer.from(`${userId}.${sig}`, 'utf8').toString('base64url');
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const dot = decoded.lastIndexOf('.');
    if (dot < 1) return null;
    const userId = decoded.slice(0, dot);
    const sig = decoded.slice(dot + 1);
    const expected = sign(userId);
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'))) {
      return null;
    }
    return userId;
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(userId: string): string {
  return `${BASE_URL}/api/unsubscribe?token=${buildUnsubscribeToken(userId)}`;
}

export function applyUnsubscribe(html: string, userId: string): string {
  const url = buildUnsubscribeUrl(userId);
  return html.replace(/\{\{unsubscribe_url\}\}/g, url);
}

export function listUnsubscribeHeaders(userId: string): Record<string, string> {
  const url = buildUnsubscribeUrl(userId);
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
