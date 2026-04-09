import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const token = authHeader.slice(7);
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: CORS_HEADERS });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, bonus_clips, rollover_clips, referral_pro_forever, referral_pro_until')
      .eq('id', user.id)
      .single();

    // Determine plan
    let plan = profile?.plan || 'free';
    if (profile?.referral_pro_forever) plan = 'pro';
    if (profile?.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) plan = 'pro';

    // Plan limits
    const planLimits: Record<string, number> = { free: 3, starter: 75, pro: 320, studio: 2000 };
    const planLimit = planLimits[plan] || 3;
    const isFree = plan === 'free';

    // Count clips used today (for free) or this month (for paid)
    let usageCount = 0;
    if (isFree) {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('clips')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00Z');
      usageCount = count || 0;
    } else {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('clips')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString());
      usageCount = count || 0;
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        plan,
        usage_today: isFree ? usageCount : 0,
        usage_month: isFree ? 0 : usageCount,
        plan_limit: planLimit,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS });
  }
}
