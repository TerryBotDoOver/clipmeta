/**
 * POST /api/admin/delete-user
 * Deletes a user and all their data in the correct cascade order.
 * Auth: Bearer clipmeta-drip-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DRIP_SECRET = (process.env.DRIP_SECRET || "clipmeta-drip-2026").trim();

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== DRIP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  try {
    // 1. Find the user
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = users.find(u => u.email === email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const uid = user.id;

    // 2. Delete in cascade order (child → parent)
    // Get all project IDs for this user
    const { data: projects } = await supabaseAdmin.from("projects").select("id").eq("user_id", uid);
    const projectIds = (projects || []).map(p => p.id);

    if (projectIds.length > 0) {
      // Delete clips (and metadata via cascade)
      const { data: clips } = await supabaseAdmin.from("clips").select("id").in("project_id", projectIds);
      const clipIds = (clips || []).map(c => c.id);
      if (clipIds.length > 0) {
        await supabaseAdmin.from("metadata_results").delete().in("clip_id", clipIds);
        await supabaseAdmin.from("clips").delete().in("id", clipIds);
      }
      await supabaseAdmin.from("exports").delete().in("project_id", projectIds);
      await supabaseAdmin.from("projects").delete().in("id", projectIds);
    }

    // Delete other user data
    await supabaseAdmin.from("drip_log").delete().eq("user_id", uid);
    await supabaseAdmin.from("referrals").delete().eq("referrer_id", uid);
    await supabaseAdmin.from("profiles").delete().eq("id", uid);

    // 3. Delete auth user
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true, deleted: email });
  } catch (err) {
    console.error("[delete-user]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
