import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CLICK_ID_KEYS = ["gclid", "fbclid", "msclkid", "rdt_cid"] as const;

function clickIdSummary(body: Record<string, unknown>) {
  return CLICK_ID_KEYS
    .map((key) => {
      const value = body[key];
      return typeof value === "string" && value.trim() ? `${key}=${value.trim()}` : null;
    })
    .filter(Boolean)
    .join("&");
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as Record<string, unknown>;
    const clickIds = clickIdSummary(body);

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
      utm_source: stringOrNull(body.utm_source),
      utm_medium: stringOrNull(body.utm_medium),
      utm_campaign: stringOrNull(body.utm_campaign),
      utm_referrer: stringOrNull(body.referrer),
      utm_content: stringOrNull(body.utm_content) ?? stringOrNull(body.ref) ?? stringOrNull(clickIds),
      utm_term: stringOrNull(body.utm_term),
      utm_landing_path: stringOrNull(body.landing_path),
      utm_captured_at: stringOrNull(body.captured_at) ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: fullError } = await supabaseAdmin
      .from("profiles")
      .update(fullUpdate)
      .eq("id", user.id);

    if (fullError) {
      // Older databases may not have the expanded attribution columns yet.
      const { error: fallbackError } = await supabaseAdmin.from("profiles").update({
        utm_source: stringOrNull(body.utm_source),
        utm_medium: stringOrNull(body.utm_medium),
        utm_campaign: stringOrNull(body.utm_campaign),
        utm_referrer: stringOrNull(body.referrer),
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
