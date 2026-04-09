import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const referredBy = body.ref as string;

    if (!referredBy || typeof referredBy !== 'string' || referredBy.length > 8) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    // Don't let users refer themselves
    if (user.id.startsWith(referredBy)) {
      return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
    }

    // Store referred_by in the user's profile
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        referred_by: referredBy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      // Column might not exist yet — log and return gracefully
      console.error('Referral track error:', error);
      return NextResponse.json({ ok: true, note: 'Referral column may not exist yet' });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Referral track error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
