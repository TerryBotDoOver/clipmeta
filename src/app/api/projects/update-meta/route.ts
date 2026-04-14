import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { projectId, pinnedKeywords, pinnedKeywordsPosition, location, shootingDate, isEditorial, editorialCity, editorialState, editorialCountry, editorialDate } = await req.json();

    if (!projectId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 1. Update PROJECT with global settings (no more editorial_text at project level)
    const { error } = await supabase
      .from("projects")
      .update({
        pinned_keywords: pinnedKeywords ?? null,
        pinned_keywords_position: pinnedKeywordsPosition ?? 'beginning',
        location: location ?? null,
        shooting_date: shootingDate ?? null,
        is_editorial: isEditorial ?? false,
        editorial_city: editorialCity ?? null,
        editorial_state: editorialState ?? null,
        editorial_country: editorialCountry ?? null,
        editorial_date: editorialDate ?? null,
      })
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    // 2. Propagate to ALL clips in this project:
    //    - is_editorial flag (so each clip knows whether it's editorial)
    //    - city/state/country/date (global location, same for the whole batch)
    //    - editorial_text is NOT touched — each clip keeps its unique AI-generated caption
    await supabaseAdmin
      .from("clips")
      .update({
        is_editorial: isEditorial ?? false,
        editorial_city: editorialCity ?? null,
        editorial_state: editorialState ?? null,
        editorial_country: editorialCountry ?? null,
        editorial_date: editorialDate ?? null,
      })
      .eq("project_id", projectId);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
