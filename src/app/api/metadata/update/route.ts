import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { clip_id, title, description, keywords, category, location } =
      await req.json();

    if (!clip_id) {
      return NextResponse.json(
        { message: "clip_id is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("metadata_results")
      .update({
        title,
        description,
        keywords,
        category,
        location,
      })
      .eq("clip_id", clip_id);

    if (error) {
      return NextResponse.json(
        { message: error.message || "Failed to update metadata." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Unexpected error." },
      { status: 500 }
    );
  }
}
