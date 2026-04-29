import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DRIP_SECRET = (process.env.DRIP_SECRET || "clipmeta-drip-2026").trim();

type AuthUserLite = {
  id: string;
  email?: string | null;
};

async function findUserByEmail(email: string): Promise<AuthUserLite | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;

    const users = (data?.users || []) as AuthUserLite[];
    const match = users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (users.length < 100) break;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== DRIP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, userId, clips } = await req.json();
  const amount = Number(clips);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 500) {
    return NextResponse.json({ error: "clips must be an integer from 1 to 500" }, { status: 400 });
  }

  const user = typeof userId === "string" && userId
    ? ((await supabaseAdmin.auth.admin.getUserById(userId)).data.user as AuthUserLite | null)
    : typeof email === "string"
      ? await findUserByEmail(email)
      : null;

  if (!user?.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("bonus_clips")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const previousBonusClips = Number(profile.bonus_clips || 0);
  const newBonusClips = previousBonusClips + amount;

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      bonus_clips: newBonusClips,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    email: user.email || email || null,
    addedClips: amount,
    previousBonusClips,
    newBonusClips,
  });
}
