/*
 * SUPABASE MIGRATION — run in the SQL editor:
 *
 * create table if not exists exports (
 *   id           uuid        primary key default gen_random_uuid(),
 *   user_id      uuid        references auth.users(id) on delete set null,
 *   project_id   uuid        references projects(id) on delete set null,
 *   platform     text        not null,
 *   clip_count   integer     not null,
 *   exported_at  timestamptz not null default now()
 * );
 *
 * alter table exports enable row level security;
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { buildCSV, getExportFilename, type ExportPlatform } from "@/lib/csvExport";

const VALID_PLATFORMS: ExportPlatform[] = ["blackbox", "shutterstock", "adobe", "pond5", "generic"];

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  const platformParam = req.nextUrl.searchParams.get("platform") ?? "generic";
  const platform = VALID_PLATFORMS.includes(platformParam as ExportPlatform)
    ? (platformParam as ExportPlatform)
    : "generic";

  if (!projectId) {
    return NextResponse.json({ message: "project_id is required." }, { status: 400 });
  }

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("name, slug, location, shooting_date, pinned_keywords, pinned_keywords_position, is_editorial, editorial_text, editorial_city, editorial_state, editorial_country, editorial_date, generation_settings")
    .eq("id", projectId)
    .single();

  const { data: clips, error } = await supabaseAdmin
    .from("clips")
    .select("*, metadata_results(*)")
    .eq("project_id", projectId)
    .eq("metadata_status", "complete")
    .order("created_at", { ascending: true });

  if (error || !clips || clips.length === 0) {
    return NextResponse.json(
      { message: "No clips with metadata found for this project." },
      { status: 404 }
    );
  }

  // Parse pinned keywords and position from project settings
  const pinnedRaw = project?.pinned_keywords ?? "";
  const pinned = pinnedRaw.split(",").map((k: string) => k.trim()).filter(Boolean);
  const pinnedPosition = project?.pinned_keywords_position ?? "beginning";
  const pinnedLower = new Set(pinned.map((k: string) => k.toLowerCase()));

  const rows = clips.map((clip) => {
    // Start with the clip's generated keywords
    let keywords: string[] = clip.metadata_results?.keywords ?? [];

    // Apply pinned keywords at export time (ensures they're always present even if added after generation)
    if (pinned.length > 0) {
      // Remove any existing instances of pinned keywords to avoid duplicates
      const filtered = keywords.filter((k: string) => !pinnedLower.has(k.toLowerCase()));
      if (pinnedPosition === "end") {
        keywords = [...filtered, ...pinned];
      } else if (pinnedPosition === "middle") {
        const mid = Math.floor(filtered.length / 2);
        keywords = [...filtered.slice(0, mid), ...pinned, ...filtered.slice(mid)];
      } else {
        // beginning (default)
        keywords = [...pinned, ...filtered];
      }
    }

    return {
      filename: clip.original_filename ?? "",
      title: clip.metadata_results?.title ?? "",
      description: clip.metadata_results?.description ?? "",
      keywords,
      category: clip.metadata_results?.category ?? "",
      location: clip.metadata_results?.location ?? null,
      confidence: clip.metadata_results?.confidence ?? "",
      is_editorial: clip.is_editorial ?? null,
      editorial_text: clip.editorial_text ?? null,
      editorial_city: clip.editorial_city ?? null,
      editorial_state: clip.editorial_state ?? null,
      editorial_country: clip.editorial_country ?? null,
      editorial_date: clip.editorial_date ?? null,
    };
  });

  // Get the user's keyword limit from project settings (if set)
  const userKeywordLimit = project?.generation_settings?.keywordCount ?? undefined;

  const csv = buildCSV(platform, rows, project?.name ?? "project", project?.location ?? undefined, project?.shooting_date ?? undefined, {
    isEditorial: project?.is_editorial ?? false,
    editorialText: project?.editorial_text ?? undefined,
    editorialCity: project?.editorial_city ?? undefined,
    editorialState: project?.editorial_state ?? undefined,
    editorialCountry: project?.editorial_country ?? undefined,
    editorialDate: project?.editorial_date ?? undefined,
  }, userKeywordLimit);
  const filename = getExportFilename(platform, project?.slug ?? "project");

  // Log the export
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabaseAdmin.from("export_logs").insert({
        user_id: user.id,
        project_id: projectId,
        platform,
        clip_count: clips.length,
      });
    }
  } catch {
    // Non-fatal — don't block the download if logging fails
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
