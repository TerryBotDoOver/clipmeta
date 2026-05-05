import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateMetadata } from "@/lib/generateMetadata";
import { Platform, GenerationSettings } from "@/lib/platform-presets";
import { PLANS, entitlementPlanFromProfile, getUsagePeriodStart } from "@/lib/plans";
import { getRegensUsedSince, recordRegenerationEvent, syncRegenerationCounter } from "@/lib/regenerationUsage";

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

    // ─── Check plan limits ─────────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, stripe_subscription_status, bonus_clips, rollover_clips, referral_pro_forever, referral_pro_until, credits, regens_used_this_month, billing_period_start')
      .eq('id', userId)
      .single();

    // Detect if this is a regeneration (metadata already exists for this clip)
    const { count: existingMetaCount } = await supabaseAdmin
      .from('metadata_results')
      .select('id', { count: 'exact', head: true })
      .eq('clip_id', clip_id);
    const isRegeneration = (existingMetaCount || 0) > 0;

    const userCredits: number = profile?.credits ?? 0;
    const usagePeriodStart = getUsagePeriodStart(
      profile?.plan,
      profile?.billing_period_start
    ).toISOString();

    if (userCredits > 0) {
      // Use one credit instead of subscription allowance
      await supabaseAdmin
        .from('profiles')
        .update({ credits: userCredits - 1, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } else {
      // Check plan limits normally
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

      // ─── Check regeneration limits ──────────────────────────────────────────
      // Regeneration = generating metadata for a clip that already has metadata
      // Limits: free=1/day, starter=100/month, pro=300/month, studio=500/month
      // Uses dedicated counter (profiles.regens_used_this_month) — no derivation.
      if (isRegeneration) {
        const regenLimit = PLANS[plan].regens;
        const regensUsed = await getRegensUsedSince(userId, usagePeriodStart);

        if (plan === 'free') {
          if (regensUsed >= regenLimit) {
            return NextResponse.json({
              message: 'Daily regeneration limit reached. Free accounts get 1 regeneration per day.',
              upgrade_url: '/pricing',
              limit_reached: true,
            }, { status: 429 });
          }
        } else {
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

    // Regeneration usage is recorded after metadata saves successfully.
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
        // Re-trim to target count AFTER adding pinned keywords.
        // Pinned keywords stay (they're at the position the user chose),
        // excess AI-generated keywords are trimmed from the end.
        metadata.keywords = metadata.keywords.slice(0, settings.keywordCount);
      }
    }

    // Save the first frame as a thumbnail (base64 data URL)
    const thumbnailUrl = frames[0] ?? null;

    // ─── Snapshot current metadata into history before overwriting ────────────
    // Lets the user revert to the previous version (one step back).
    // Only one history row per clip (replace any prior history on regen).
    if (isRegeneration) {
      const { data: prevRow } = await supabaseAdmin
        .from("metadata_results")
        .select("title, description, keywords, category, secondary_category, location, confidence, model_used, thumbnail_url, generated_at")
        .eq("clip_id", clip_id)
        .single();

      if (prevRow) {
        // Delete any prior history (keep at most one) then insert current as history.
        await supabaseAdmin.from("metadata_history").delete().eq("clip_id", clip_id);
        await supabaseAdmin.from("metadata_history").insert({
          clip_id,
          title: prevRow.title,
          description: prevRow.description,
          keywords: prevRow.keywords,
          category: prevRow.category,
          secondary_category: prevRow.secondary_category,
          location: prevRow.location,
          confidence: prevRow.confidence,
          model_used: prevRow.model_used,
          thumbnail_url: prevRow.thumbnail_url,
          generated_at: prevRow.generated_at,
        });
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

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

    if (isRegeneration) {
      try {
        await recordRegenerationEvent({
          clipId: clip_id,
          userId,
          projectId: clip.project_id,
          originalFilename: clip.original_filename,
          metadataTitle: metadata.title,
          metadataKeywords: metadata.keywords,
        });
        await syncRegenerationCounter(userId, usagePeriodStart);
      } catch {
        // Metadata saved successfully; usage analytics can be reconciled later.
      }
    }

    // Always save a unique per-clip editorial caption (pre-generated by GPT-4o).
    // This caption sits dormant until the user activates editorial mode via the
    // right-side panel on the review page. When they do, each clip already has
    // its OWN factual caption instead of getting the same project-level text.
    // City/state/country/date are set globally by the user via the editorial panel —
    // they override whatever's here. We only pre-fill from project if already set.
    await supabaseAdmin
      .from("clips")
      .update({
        editorial_text: metadata.editorial_caption,
        // Only set is_editorial if the project is already marked editorial
        ...(project?.is_editorial ? { is_editorial: true } : {}),
        // Pre-fill location from project if available (user can override via panel)
        ...(project?.editorial_city ? { editorial_city: project.editorial_city } : {}),
        ...(project?.editorial_state ? { editorial_state: project.editorial_state } : {}),
        ...(project?.editorial_country ? { editorial_country: project.editorial_country } : {}),
        ...(project?.editorial_date ? { editorial_date: project.editorial_date } : {}),
      })
      .eq("id", clip_id);

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
