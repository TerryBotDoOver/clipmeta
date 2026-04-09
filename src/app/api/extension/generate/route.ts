import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateMetadata as generateClipMetadata } from '@/lib/generateMetadata';

// CORS headers so the Chrome extension can call this endpoint
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    // ─── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      );
    }
    const token = authHeader.slice(7);

    // Verify token with Supabase
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // ─── Usage Limits ──────────────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, bonus_clips, rollover_clips, referral_pro_forever, referral_pro_until, clips_used_this_month, billing_period_start')
      .eq('id', user.id)
      .single();

    let plan = profile?.plan ?? 'free';
    if (profile?.referral_pro_forever) plan = 'pro';
    if (profile?.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) plan = 'pro';

    const planLimits: Record<string, number> = { free: 3, starter: 75, pro: 320, studio: 2000 };
    const planBaseLimit = planLimits[plan] || 3;
    const bonusClips = profile?.bonus_clips || 0;
    const rolloverClips = profile?.rollover_clips || 0;
    const totalLimit = planBaseLimit + bonusClips + rolloverClips;

    if (plan === 'free') {
      const today = new Date().toISOString().slice(0, 10);
      const { count: dailyCount } = await supabaseAdmin
        .from('clips')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00Z');
      const usageCount = dailyCount || 0;
      if (usageCount >= planBaseLimit) {
        return NextResponse.json(
          { error: 'Daily limit reached. Free accounts get 3 clips per day.', upgrade_url: 'https://clipmeta.app/pricing', limit_reached: true },
          { status: 429, headers: CORS_HEADERS }
        );
      }
    } else {
      // Count clip uploads from clip_history (includes deleted clips, excludes regens)
      const billingStart = profile?.billing_period_start
        ? new Date(profile.billing_period_start).toISOString()
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: uploadCount } = await supabaseAdmin
        .from('clip_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', 'created')
        .gte('created_at', billingStart);
      const usageCount = uploadCount || 0;
      if (usageCount >= totalLimit) {
        return NextResponse.json(
          { error: `Monthly limit reached. Your ${plan} plan allows ${totalLimit} clips per month. You've used ${usageCount}.`, upgrade_url: 'https://clipmeta.app/pricing', limit_reached: true },
          { status: 429, headers: CORS_HEADERS }
        );
      }
    }

    // ─── Parse Body ────────────────────────────────────────────────────────────
    const body = await req.json();
    const { frames, platform } = body as { frames: string[]; platform?: string };

    if (!frames || !frames.length) {
      return NextResponse.json(
        { error: 'No frames provided' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ─── Generate using the same engine as the main app ────────────────────────
    const targetPlatform = platform === 'blackbox' ? 'blackbox' : 'generic';
    
    const metadata = await generateClipMetadata({
      filename: 'extension-clip.mp4',
      frames: frames,
      platform: targetPlatform as any,
      settings: {
        keywordCount: 49,
        titleStyle: 'seo',
        descStyle: 'detailed',
        includeLocation: true,
        includeCameraDetails: true,
        titleMaxChars: 100,
        descMaxChars: 200,
        keywordFormat: 'mixed',
        hasDescription: true,
      },
    });

    // ─── Return ────────────────────────────────────────────────────────────────
    return NextResponse.json(
      { success: true, metadata },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Generation failed';
    console.error('[extension/generate] Error:', error);
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
