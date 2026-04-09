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
      .select("utm_source")
      .eq("id", user.id)
      .single();

    if (existing?.utm_source) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await supabaseAdmin.from("profiles").update({
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      utm_referrer: body.referrer ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("UTM save error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
