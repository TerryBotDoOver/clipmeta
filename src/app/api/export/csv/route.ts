import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");

  if (!projectId) {
    return NextResponse.json(
      { message: "project_id is required." },
      { status: 400 }
    );
  }

  // Fetch project
  const { data: project } = await supabase
    .from("projects")
    .select("name, slug")
    .eq("id", projectId)
    .single();

  // Fetch clips with metadata
  const { data: clips, error } = await supabase
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

  // Build CSV
  const headers = [
    "Filename",
    "Title",
    "Description",
    "Keywords",
    "Category",
    "Location",
    "Confidence",
  ];

  const rows = clips.map((clip) => {
    const meta = clip.metadata_results;
    return [
      csvEscape(clip.original_filename),
      csvEscape(meta?.title ?? ""),
      csvEscape(meta?.description ?? ""),
      csvEscape((meta?.keywords ?? []).join(", ")),
      csvEscape(meta?.category ?? ""),
      csvEscape(meta?.location ?? ""),
      csvEscape(meta?.confidence ?? ""),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  const filename = project
    ? `${project.slug || "project"}-metadata.csv`
    : "clipmeta-export.csv";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvEscape(value: string): string {
  if (!value) return '""';
  // If value contains comma, quote, or newline — wrap in quotes and escape inner quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
