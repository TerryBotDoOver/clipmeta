/**
 * Worker API endpoint
 * Called by the local video worker (Dell machine) with pre-extracted frames
 * Accepts frames from any video format including ProRes 422
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateMetadata } from "@/lib/generateMetadata";
import { Platform, GenerationSettings } from "@/lib/platform-presets";
import { PLANS, entitlementPlanFromProfile } from "@/lib/plans";

const WORKER_SECRET = process.env.WORKER_SECRET || 'vyzpFC5PVM7HRI4EkZsmTOd8DgJe2cAX';

export async function POST(req: NextRequest) {
  // Authenticate worker
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${WORKER_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clip_id, frames } = await req.json();

    if (!clip_id) return NextResponse.json({ message: "clip_id required" }, { status: 400 });
    if (!Array.isArray(frames) || frames.length === 0) return NextResponse.json({ message: "frames required" }, { status: 400 });

    // Fetch clip and project (include user_id from projects for plan checks)
    const { data: clip, error: clipError } = await supabaseAdmin
      .from("clips")
      .select("*, projects(name, user_id)")
      .eq("id", clip_id)
      .single();

    if (clipError || !clip) return NextResponse.json({ message: "Clip not found" }, { status: 404 });

    const userId = clip.projects?.user_id;

    // ─── Check plan limits (same as main generate route) ──────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, stripe_subscription_status, bonus_clips, rollover_clips, referral_pro_forever, referral_pro_until, credits, regens_used_this_month, billing_period_start')
      .eq('id', userId)
      .single();

    // Detect regeneration
    const { count: existingMetaCount } = await supabaseAdmin
      .from('metadata_results')
      .select('id', { count: 'exact', head: true })
      .eq('clip_id', clip_id);
    const isRegeneration = (existingMetaCount || 0) > 0;

    const userCredits: number = profile?.credits ?? 0;

    if (userCredits > 0) {
      await supabaseAdmin
        .from('profiles')
        .update({ credits: userCredits - 1, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } else {
      let plan = entitlementPlanFromProfile(profile?.plan, profile?.stripe_subscription_status);
      if (profile?.referral_pro_forever) plan = 'pro';
      if (profile?.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) plan = 'pro';

      // ─── Clip upload limits are NOT checked here ──────────────────────────
      // Upload limits are enforced in POST /api/clips when the clip record is
      // created. By the time this route is called, the clip already exists and
      // was already counted against the user's plan. Re-checking here would
      // block first-time metadata generation for clips that were legitimately
      // uploaded within the limit.
      // ──────────────────────────────────────────────────────────────────────

      // ─── Regeneration limits ────────────────────────────────────────────────
      // Uses dedicated counter (profiles.regens_used_this_month) — no derivation.
      // Limits: free=1/day, starter=100/month, pro=300/month, studio=500/month
      if (isRegeneration) {
        const regenLimit = PLANS[plan].regens;
        const regensUsed: number = profile?.regens_used_this_month ?? 0;

        if (plan === 'free') {
          if (regensUsed >= regenLimit) {
            return NextResponse.json({ message: 'Daily regeneration limit reached.', limit_reached: true }, { status: 429 });
          }
        } else {
          if (regensUsed >= regenLimit) {
            return NextResponse.json({ message: `Monthly regeneration limit reached. ${plan} plan allows ${regenLimit} regenerations.`, limit_reached: true }, { status: 429 });
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────────
    }

    // Increment regens_used_this_month only for regenerations.
    // Upload counts come from clip_history via the DB trigger, not from a profile field.
    if (isRegeneration) {
      try {
        const { data: currentProfile } = await supabaseAdmin
          .from('profiles')
          .select('regens_used_this_month')
          .eq('id', userId)
          .single();
        await supabaseAdmin
          .from('profiles')
          .update({
            regens_used_this_month: (currentProfile?.regens_used_this_month || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch { /* non-fatal */ }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("platform, generation_settings, pinned_keywords, pinned_keywords_position, is_editorial, editorial_text, editorial_city, editorial_state, editorial_country, editorial_date")
      .eq("id", clip.project_id)
      .single();

    const settings: GenerationSettings = project?.generation_settings ?? {
      keywordCount: 35,
      titleStyle: "seo",
      descStyle: "detailed",
      includeLocation: true,
      includeCameraDetails: true,
      titleMaxChars: 200,
      descMaxChars: 300,
    };
    const platform: Platform = (project?.platform as Platform) ?? "generic";

    // Get existing titles for uniqueness
    const { data: existingResults } = await supabaseAdmin
      .from("metadata_results")
      .select("title, clips!inner(project_id)")
      .eq("clips.project_id", clip.project_id)
      .neq("clip_id", clip_id)
      .order("generated_at", { ascending: false })
      .limit(25);

    const existingTitles: string[] = (existingResults ?? [])
      .map((r: { title?: string }) => r.title)
      .filter((t): t is string => typeof t === "string" && t.length > 0);

    // Mark as processing
    await supabaseAdmin.from("clips").update({ metadata_status: "processing" }).eq("id", clip_id);

    // Generate metadata
    const metadata = await generateMetadata({
      filename: clip.original_filename,
      frames,
      projectName: clip.projects?.name,
      platform,
      settings,
      existingTitles,
    });

    // Prepend pinned keywords from project settings
    if (project?.pinned_keywords) {
      const pinned = project.pinned_keywords
        .split(",")
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);
      if (pinned.length > 0) {
        const pinnedLower = new Set(pinned.map((k: string) => k.toLowerCase()));
        const filtered = metadata.keywords.filter(
          (k: string) => !pinnedLower.has(k.toLowerCase())
        );
        const position = project.pinned_keywords_position || 'beginning';
        if (position === 'beginning') {
          metadata.keywords = [...pinned, ...filtered];
        } else if (position === 'end') {
          metadata.keywords = [...filtered, ...pinned];
        } else { // middle
          const mid = Math.floor(filtered.length / 2);
          metadata.keywords = [...filtered.slice(0, mid), ...pinned, ...filtered.slice(mid)];
        }
        // Re-trim to target count AFTER adding pinned keywords
        metadata.keywords = metadata.keywords.slice(0, settings.keywordCount);
      }
    }

    const thumbnailUrl = frames[0] ?? null;

    // Save results
    const { error: insertError } = await supabaseAdmin
      .from("metadata_results")
      .upsert({
        clip_id,
        title: metadata.title,
        description: metadata.description,
        keywords: metadata.keywords,
        category: metadata.category,
        location: metadata.location,
        confidence: metadata.confidence,
        generated_at: new Date().toISOString(),
        model_used: "gpt-4o",
        thumbnail_url: thumbnailUrl,
      }, { onConflict: 'clip_id' });

    if (insertError) {
      await supabaseAdmin.from("clips").update({ metadata_status: "failed" }).eq("id", clip_id);
      return NextResponse.json({ message: "Failed to save metadata" }, { status: 500 });
    }

    // Always save a unique per-clip editorial caption (pre-generated by GPT-4o).
    // Sits dormant until user activates editorial mode via the review page panel.
    await supabaseAdmin
      .from("clips")
      .update({
        editorial_text: metadata.editorial_caption,
        ...(project?.is_editorial ? { is_editorial: true } : {}),
        ...(project?.editorial_city ? { editorial_city: project.editorial_city } : {}),
        ...(project?.editorial_state ? { editorial_state: project.editorial_state } : {}),
        ...(project?.editorial_country ? { editorial_country: project.editorial_country } : {}),
        ...(project?.editorial_date ? { editorial_date: project.editorial_date } : {}),
      })
      .eq("id", clip_id);

    // Mark complete (increment already done above before generation)
    await supabaseAdmin.from("clips").update({ metadata_status: "complete" }).eq("id", clip_id);

    return NextResponse.json({ ok: true, title: metadata.title });

  } catch (err: unknown) {
    console.error("[generate-worker] Error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Worker generation failed" },
      { status: 500 }
    );
  }
}
