import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('Missing RESEND_API_KEY environment variable');
    _resend = new Resend(key);
  }
  return _resend;
}

// Named export for convenience in route handlers
export { getResend as resend };
