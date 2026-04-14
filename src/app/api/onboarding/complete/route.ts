import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only set promo_unlocked_at the FIRST time onboarding completes
  // (so re-running this endpoint doesn't reset the 24h window)
  const { data: existing } = await supabase
    .from("profiles")
    .select("onboarding_complete, promo_unlocked_at")
    .eq("id", user.id)
    .single();

  const updates: Record<string, unknown> = { onboarding_complete: true };
  if (!existing?.onboarding_complete && !existing?.promo_unlocked_at) {
    updates.promo_unlocked_at = new Date().toISOString();
  }

  await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  return NextResponse.json({ ok: true, promo_unlocked: !existing?.promo_unlocked_at });
}
