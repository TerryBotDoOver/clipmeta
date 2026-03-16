import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { clip_id, filename } = await req.json();

    if (!clip_id || !filename?.trim()) {
      return NextResponse.json({ message: "clip_id and filename are required." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("clips")
      .update({ original_filename: filename.trim() })
      .eq("id", clip_id);

    if (error) {
      return NextResponse.json({ message: "Failed to rename clip." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Unexpected error." }, { status: 500 });
  }
}
