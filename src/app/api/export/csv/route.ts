import { supabaseAdmin } from "@/lib/supabase-admin";
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
    .select("name, slug")
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

  const rows = clips.map((clip) => ({
    filename: clip.original_filename ?? "",
    title: clip.metadata_results?.title ?? "",
    description: clip.metadata_results?.description ?? "",
    keywords: clip.metadata_results?.keywords ?? [],
    category: clip.metadata_results?.category ?? "",
    location: clip.metadata_results?.location ?? null,
    confidence: clip.metadata_results?.confidence ?? "",
  }));

  const csv = buildCSV(platform, rows, project?.name ?? "project");
  const filename = getExportFilename(platform, project?.slug ?? "project");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
