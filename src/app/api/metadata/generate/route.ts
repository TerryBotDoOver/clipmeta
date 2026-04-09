import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateMetadata } from "@/lib/generateMetadata";
import { Platform, GenerationSettings } from "@/lib/platform-presets";

export async function POST(req: NextRequest) {
  try {
    const { clip_id, frames } = await req.json();

    if (!clip_id) {
      return NextResponse.json({ message: "clip_id is required." }, { status: 400 });
    }

    // Frames can be empty for large files or unsupported codecs (ProRes, RAW, etc.)
    // In that case we generate metadata from filename + project context only
    if (!Array.isArray(frames)) {
      return NextResponse.json({ message: "frames array is required (can be empty)." }, { status: 400 });
    }

    // Fetch the clip and its project (include user_id from projects for plan checks)
    const { data: clip, error: clipError } = await supabaseAdmin
      .from("clips")
      .select("*, projects(name, user_id)")
      .eq("id", clip_id)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ message: "Clip not found." }, { status: 404 });
    }

    // user_id comes from the projects relation, not clips table directly
    const userId = clip.projects?.user_id;

    // Get project platform settings
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("platform, generation_settings, pinned_keywords, pinned_keywords_position")
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

    // ─── Check plan limits ─────────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, bonus_clips, rollover_clips, referral_pro_forever, referral_pro_until, credits, clips_used_this_month, regens_used_this_month, billing_period_start')
      .eq('id', userId)
      .single();

    // Detect if this is a regeneration (metadata already exists for this clip)
    const { count: existingMetaCount } = await supabaseAdmin
      .from('metadata_results')
      .select('id', { count: 'exact', head: true })
      .eq('clip_id', clip_id);
    const isRegeneration = (existingMetaCount || 0) > 0;

    const userCredits: number = profile?.credits ?? 0;

    if (userCredits > 0) {
      // Use one credit instead of subscription allowance
      await supabaseAdmin
        .from('profiles')
        .update({ credits: userCredits - 1, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } else {
      // Check plan limits normally
      let plan = profile?.plan || 'free';
      if (profile?.referral_pro_forever) plan = 'pro';
      if (profile?.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) plan = 'pro';

      const planLimits: Record<string, number> = { free: 3, starter: 140, pro: 320, studio: 2000 };
      const planBaseLimit = planLimits[plan] || 3;
      const bonusClips = profile?.bonus_clips || 0;
      const rolloverClips = profile?.rollover_clips || 0;
      const totalLimit = planBaseLimit + bonusClips + rolloverClips;

      // Get all project IDs for this user to count clips correctly
      // (clips table has project_id, not user_id)
      const { data: userProjects } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('user_id', userId);
      const projectIds = (userProjects || []).map((p: { id: string }) => p.id);

      // ─── Clip upload limits are NOT checked here ──────────────────────────
      // Upload limits are enforced in POST /api/clips when the clip record is
      // created. By the time this route is called, the clip already exists and
      // was already counted against the user's plan. Re-checking here would
      // block first-time metadata generation for clips that were legitimately
      // uploaded within the limit.
      // ──────────────────────────────────────────────────────────────────────

      // ─── Check regeneration limits ──────────────────────────────────────────
      // Regeneration = generating metadata for a clip that already has metadata
      // Limits: free=1/day, starter=100/month, pro=300/month, studio=unlimited
      // Uses dedicated counter (profiles.regens_used_this_month) — no derivation.
      if (isRegeneration) {
        const regenLimits: Record<string, number> = { free: 1, starter: 100, pro: 300, studio: 999999 };
        const regenLimit = regenLimits[plan] || 1;
        const regensUsed: number = profile?.regens_used_this_month ?? 0;

        if (plan === 'free') {
          if (regensUsed >= regenLimit) {
            return NextResponse.json({
              message: 'Daily regeneration limit reached. Free accounts get 1 regeneration per day.',
              upgrade_url: '/pricing',
              limit_reached: true,
            }, { status: 429 });
          }
        } else if (plan !== 'studio') {
          if (regensUsed >= regenLimit) {
            return NextResponse.json({
              message: `Monthly regeneration limit reached. Your ${plan} plan allows ${regenLimit} regenerations per month.`,
              upgrade_url: '/pricing',
              limit_reached: true,
            }, { status: 429 });
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────────
    }

    // Increment clips_used_this_month for every generation.
    // Increment regens_used_this_month only for regenerations.
    try {
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('clips_used_this_month, regens_used_this_month')
        .eq('id', userId)
        .single();
      const updates: Record<string, unknown> = {
        clips_used_this_month: (currentProfile?.clips_used_this_month || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      if (isRegeneration) {
        updates.regens_used_this_month = (currentProfile?.regens_used_this_month || 0) + 1;
      }
      await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId);
    } catch { /* non-fatal */ }
    // ──────────────────────────────────────────────────────────────────────────

    // Fetch titles and descriptions already generated in this batch — used to enforce uniqueness
    const { data: existingResults } = await supabaseAdmin
      .from("metadata_results")
      .select("title, description, keywords, clips!inner(project_id)")
      .eq("clips.project_id", clip.project_id)
      .neq("clip_id", clip_id)
      .order("generated_at", { ascending: false })
      .limit(25);

    const existingTitles: string[] = (existingResults ?? [])
      .map((r: { title?: string }) => r.title)
      .filter((t): t is string => typeof t === "string" && t.length > 0);

    const existingDescriptions: string[] = (existingResults ?? [])
      .map((r: { description?: string }) => r.description)
      .filter((d): d is string => typeof d === "string" && d.length > 0);

    // Mark clip as processing
    await supabaseAdmin
      .from("clips")
      .update({ metadata_status: "processing" })
      .eq("id", clip_id);

    // Generate metadata
    let metadata;
    try {
      metadata = await generateMetadata({
        filename: clip.original_filename,
        frames,
        projectName: clip.projects?.name,
        platform,
        settings,
        existingTitles,
        existingDescriptions,
      });
    } catch (genError: unknown) {
      await supabaseAdmin
        .from("clips")
        .update({ metadata_status: "failed" })
        .eq("id", clip_id);

      return NextResponse.json(
        { message: genError instanceof Error ? genError.message : "Metadata generation failed." },
        { status: 500 }
      );
    }

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
      }
    }

    // Save the first frame as a thumbnail (base64 data URL)
    const thumbnailUrl = frames[0] ?? null;

    // Store results (onConflict: clip_id allows regeneration to overwrite existing metadata)
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
      await supabaseAdmin
        .from("clips")
        .update({ metadata_status: "failed" })
        .eq("id", clip_id);

      return NextResponse.json({ message: "Failed to save metadata results." }, { status: 500 });
    }

    // Mark complete — keep storage_path so video stays available for regeneration
    await supabaseAdmin
      .from("clips")
      .update({ metadata_status: "complete" })
      .eq("id", clip_id);

    return NextResponse.json({ ok: true, metadata });
  } catch {
    return NextResponse.json({ message: "Unexpected error during metadata generation." }, { status: 500 });
  }
}
