import { after, NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { startMetadataGenerationForClip } from "@/lib/metadata-autostart";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // List mode: return all clips for a project with their metadata status
  if (body.action === "list" && body.project_id) {
    const { data: clips } = await supabase
      .from("clips")
      .select("*, metadata_results(*)")
      .eq("project_id", body.project_id)
      .order("created_at", { ascending: false });

    // Flatten metadata_results from array to single object (Supabase returns array for 1-to-many joins)
    const formatted: Record<string, unknown>[] = (clips || []).map((c: Record<string, unknown>) => ({
      ...c,
      metadata_results: Array.isArray(c.metadata_results)
        ? (c.metadata_results as Record<string, unknown>[]).length > 0
          ? (c.metadata_results as Record<string, unknown>[])[0]
          : null
        : c.metadata_results,
    }));

    const pendingIds = formatted
      .filter((c) => c.metadata_status === "not_started" && typeof c.id === "string")
      .map((c) => c.id as string);

    if (pendingIds.length > 0) {
      const origin = req.nextUrl.origin;
      after(async () => {
        for (const clipId of pendingIds) {
          await startMetadataGenerationForClip({
            clipId,
            origin,
            source: "review-list",
          });
        }
      });
    }

    return NextResponse.json({ clips: formatted });
  }

  // Update editorial mode
  if (body.action === "update_editorial" && body.clip_id) {
    const { clip_id, is_editorial, editorial_text, editorial_city, editorial_state, editorial_country, editorial_date } = body;

    // Verify ownership via join
    const { data: clip } = await supabase
      .from("clips")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", clip_id)
      .eq("projects.user_id", user.id)
      .single();

    if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await supabase.from("clips").update({
      is_editorial: is_editorial ?? null,
      editorial_text: editorial_text ?? null,
      editorial_city: editorial_city ?? null,
      editorial_state: editorial_state ?? null,
      editorial_country: editorial_country ?? null,
      editorial_date: editorial_date ?? null,
    }).eq("id", clip_id);

    return NextResponse.json({ ok: true });
  }

  // Review toggle mode
  const { clip_id, is_reviewed } = body;
  if (!clip_id || typeof is_reviewed !== "boolean") {
    return NextResponse.json({ error: "clip_id and is_reviewed required" }, { status: 400 });
  }

  // Verify ownership via join — user must own the project the clip belongs to
  const { data: clip } = await supabase
    .from("clips")
    .select("id, project_id, projects!inner(user_id)")
    .eq("id", clip_id)
    .eq("projects.user_id", user.id)
    .single();

  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.from("clips").update({ is_reviewed }).eq("id", clip_id);

  return NextResponse.json({ ok: true });
}
