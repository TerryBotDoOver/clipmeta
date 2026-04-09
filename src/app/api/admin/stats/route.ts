import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const ADMIN_ID = "93f38fdf-4506-4dfc-89a2-28767bc0b37d";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalClips },
    { count: totalProjects },
    { count: newClips },
    { data: storageData },
    { data: usersPage },
    { data: newUsersPage },
  ] = await Promise.all([
    supabaseAdmin.from("clips").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("projects").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("clips").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabaseAdmin.from("clips").select("file_size_bytes"),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const totalStorage = (storageData ?? []).reduce(
    (sum: number, c: { file_size_bytes: number | null }) => sum + (c.file_size_bytes ?? 0),
    0
  );

  const totalUsers = (usersPage as { total?: number } | null)?.total ?? 0;
  const newUsers = (newUsersPage?.users ?? []).filter(
    (u) => u.created_at && u.created_at >= weekAgo
  ).length;

  return NextResponse.json({
    totalUsers,
    totalClips: totalClips ?? 0,
    totalProjects: totalProjects ?? 0,
    totalStorage,
    newUsersThisWeek: newUsers,
    newClipsThisWeek: newClips ?? 0,
  });
}
