import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/metadata/revert
 *
 * Two-position toggle: swaps the clip's current metadata_results with its
 * one-and-only metadata_history row. This means after a revert, the user
 * can hit revert again to flip back to where they started, including any
 * manual edits they made between regenerations.
 *
 * Does NOT consume a regeneration credit -- this is a row swap, no AI call.
 *
 * Body: { clip_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { clip_id } = await req.json();
    if (!clip_id) {
      return NextResponse.json({ message: "clip_id is required." }, { status: 400 });
    }

    // ── Auth + ownership check ─────────────────────────────────────────────
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { data: clip } = await supabaseAdmin
      .from("clips")
      .select("id, projects(user_id)")
      .eq("id", clip_id)
      .single();

    type ClipWithProject = { id: string; projects: { user_id: string } | { user_id: string }[] | null };
    const c = clip as ClipWithProject | null;
    const ownerId = Array.isArray(c?.projects) ? c?.projects[0]?.user_id : c?.projects?.user_id;
    if (!c || ownerId !== user.id) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // ── Fetch the history row (the version we'll restore) ──────────────────
    const { data: historyRow } = await supabaseAdmin
      .from("metadata_history")
      .select("title, description, keywords, category, secondary_category, location, confidence, model_used, thumbnail_url, generated_at")
      .eq("clip_id", clip_id)
      .single();

    if (!historyRow) {
      return NextResponse.json({ message: "No previous version available." }, { status: 404 });
    }

    // ── Snapshot current → history (preserves hand-edits for re-revert) ────
    const { data: currentRow } = await supabaseAdmin
      .from("metadata_results")
      .select("title, description, keywords, category, secondary_category, location, confidence, model_used, thumbnail_url, generated_at")
      .eq("clip_id", clip_id)
      .single();

    if (currentRow) {
      await supabaseAdmin.from("metadata_history").delete().eq("clip_id", clip_id);
      await supabaseAdmin.from("metadata_history").insert({
        clip_id,
        ...currentRow,
      });
    }

    // ── Restore historyRow into metadata_results ───────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from("metadata_results")
      .update({
        title: historyRow.title,
        description: historyRow.description,
        keywords: historyRow.keywords,
        category: historyRow.category,
        secondary_category: historyRow.secondary_category,
        location: historyRow.location,
        confidence: historyRow.confidence,
        model_used: historyRow.model_used,
        thumbnail_url: historyRow.thumbnail_url,
        generated_at: historyRow.generated_at,
      })
      .eq("clip_id", clip_id);

    if (updateError) {
      return NextResponse.json({ message: updateError.message || "Revert failed." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      metadata: historyRow,
    });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
