import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Only write if UTMs not already set (first-write-wins)
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("utm_source, utm_referrer")
      .eq("id", user.id)
      .single();

    if (existing?.utm_source || existing?.utm_referrer) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const fullUpdate = {
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      utm_referrer: body.referrer ?? null,
      utm_content: body.utm_content ?? body.ref ?? null,
      utm_term: body.utm_term ?? null,
      utm_landing_path: body.landing_path ?? null,
      utm_captured_at: body.captured_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: fullError } = await supabaseAdmin
      .from("profiles")
      .update(fullUpdate)
      .eq("id", user.id);

    if (fullError) {
      // Older databases may not have the expanded attribution columns yet.
      const { error: fallbackError } = await supabaseAdmin.from("profiles").update({
        utm_source: body.utm_source ?? null,
        utm_medium: body.utm_medium ?? null,
        utm_campaign: body.utm_campaign ?? null,
        utm_referrer: body.referrer ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      if (fallbackError) throw fallbackError;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("UTM save error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
