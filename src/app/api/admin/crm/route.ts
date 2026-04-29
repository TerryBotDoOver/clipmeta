import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const DRIP_SECRET = process.env.DRIP_SECRET?.trim();
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET?.trim();

function isAuthorized(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")?.trim();
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const validTokens = [SERVICE_ROLE_KEY, DRIP_SECRET, ADMIN_API_SECRET].filter(Boolean);
  return validTokens.some((token) => adminKey === token || bearer === token);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const users = authData.users || [];

    // Get clip counts per user (via projects)
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, user_id, name, created_at, status");

    const { data: clips } = await supabaseAdmin
      .from("clips")
      .select("id, project_id, created_at, metadata_status");

    const { data: metadataResults } = await supabaseAdmin
      .from("metadata_results")
      .select("clip_id, generated_at");

    // Get email captures (non-auth signups)
    const { data: emailCaptures } = await supabaseAdmin
      .from("email_captures")
      .select("*")
      .order("created_at", { ascending: false });

    // Get drip log entries
    const { data: dripLogs } = await supabaseAdmin
      .from("drip_log")
      .select("user_id, email_key, sent_at")
      .order("sent_at", { ascending: true });

    const dripByUser: Record<string, Array<{ email_key: string; sent_at: string }>> = {};
    for (const d of dripLogs || []) {
      if (!dripByUser[d.user_id]) dripByUser[d.user_id] = [];
      dripByUser[d.user_id].push({ email_key: d.email_key, sent_at: d.sent_at });
    }

    // Build user profiles with activity data
    const projectsByUser: Record<string, NonNullable<typeof projects>> = {};
    for (const p of projects || []) {
      if (!projectsByUser[p.user_id]) projectsByUser[p.user_id] = [];
      projectsByUser[p.user_id]!.push(p);
    }

    const clipsByProject: Record<string, number> = {};
    const metaByProject: Record<string, number> = {};
    const lastClipByProject: Record<string, string> = {};
    for (const c of clips || []) {
      clipsByProject[c.project_id] = (clipsByProject[c.project_id] || 0) + 1;
      if (!lastClipByProject[c.project_id] || c.created_at > lastClipByProject[c.project_id]) {
        lastClipByProject[c.project_id] = c.created_at;
      }
    }

    const metaClipIds = new Set((metadataResults || []).map((m) => m.clip_id));
    for (const c of clips || []) {
      if (metaClipIds.has(c.id)) {
        metaByProject[c.project_id] = (metaByProject[c.project_id] || 0) + 1;
      }
    }

    const enrichedUsers = users.map((u) => {
      const userProjects = projectsByUser[u.id] || [];
      const totalClips = userProjects.reduce((sum, p) => sum + (clipsByProject[p.id] || 0), 0);
      const totalMeta = userProjects.reduce((sum, p) => sum + (metaByProject[p.id] || 0), 0);
      const lastActivity = userProjects.reduce((latest, p) => {
        const lastClip = lastClipByProject[p.id];
        return lastClip && lastClip > latest ? lastClip : latest;
      }, u.last_sign_in_at || u.created_at || "");

      // Determine engagement status
      let status = "new";
      if (totalClips > 0 && totalMeta > 0) status = "active";
      else if (totalClips > 0) status = "uploaded";
      const daysSinceActivity = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000)
        : 999;
      if (daysSinceActivity > 7 && status !== "new") status = "dormant";

      const userDrips = dripByUser[u.id] || [];

      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.user_metadata?.name || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        last_activity: lastActivity,
        days_since_activity: daysSinceActivity,
        status,
        projects: userProjects.length,
        total_clips: totalClips,
        total_metadata: totalMeta,
        plan: "free", // TODO: pull from billing
        emails_sent: userDrips.length,
        email_log: userDrips,
      };
    });

    // Sort by most recent first
    enrichedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      users: enrichedUsers,
      email_captures: emailCaptures || [],
      stats: {
        total_users: enrichedUsers.length,
        active: enrichedUsers.filter((u) => u.status === "active").length,
        uploaded: enrichedUsers.filter((u) => u.status === "uploaded").length,
        dormant: enrichedUsers.filter((u) => u.status === "dormant").length,
        new: enrichedUsers.filter((u) => u.status === "new").length,
        total_email_captures: (emailCaptures || []).length,
      },
    });
  } catch (err) {
    console.error("CRM API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
