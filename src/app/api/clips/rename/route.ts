import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { clip_id, filename } = await req.json();

    if (!clip_id || !filename?.trim()) {
      return NextResponse.json({ message: "clip_id and filename are required." }, { status: 400 });
    }

    // Preserve the original file extension if the user drops it during rename
    const { data: existing } = await supabaseAdmin
      .from("clips")
      .select("original_filename")
      .eq("id", clip_id)
      .single();

    let newFilename = filename.trim();
    if (existing?.original_filename) {
      const origExt = existing.original_filename.match(/\.[^.]+$/)?.[0] ?? "";
      const newExt = newFilename.match(/\.[^.]+$/)?.[0] ?? "";
      // If original had an extension but new name doesn't, re-add it
      if (origExt && !newExt) {
        newFilename += origExt;
      }
    }

    const { error } = await supabaseAdmin
      .from("clips")
      .update({ original_filename: newFilename })
      .eq("id", clip_id);

    if (error) {
      return NextResponse.json({ message: "Failed to rename clip." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Unexpected error." }, { status: 500 });
  }
}
