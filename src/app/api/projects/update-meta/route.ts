import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { projectId, pinnedKeywords, pinnedKeywordsPosition, location, shootingDate, isEditorial, editorialText, editorialCity, editorialState, editorialCountry, editorialDate } = await req.json();

    if (!projectId) {
      return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("projects")
      .update({
        pinned_keywords: pinnedKeywords ?? null,
        pinned_keywords_position: pinnedKeywordsPosition ?? 'beginning',
        location: location ?? null,
        shooting_date: shootingDate ?? null,
        is_editorial: isEditorial ?? false,
        editorial_text: editorialText ?? null,
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

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
