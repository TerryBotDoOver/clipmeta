import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, slug, created_at, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: totalClips } = await supabase
    .from("clips")
    .select("id", { count: "exact", head: true });

  const { count: totalMeta } = await supabase
    .from("metadata_results")
    .select("id", { count: "exact", head: true });

  const projectCount = projects?.length ?? 0;
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Projects</p>
            <p className="mt-2 text-4xl font-bold text-foreground">{projectCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Clips Uploaded</p>
            <p className="mt-2 text-4xl font-bold text-foreground">{totalClips ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Metadata Generated</p>
            <p className="mt-2 text-4xl font-bold text-foreground">{totalMeta ?? 0}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* Recent projects */}
          <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Projects</h2>
              <Link href="/projects" className="text-sm font-medium text-slate-500 hover:text-foreground">
                View all →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {projects && projects.length > 0 ? (
                projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-slate-300 hover:bg-muted"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {p.status}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-muted-foreground">
                  No projects yet.{" "}
                  <Link href="/projects/new" className="font-medium text-slate-900 underline">
                    Create your first →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-4 text-lg font-semibold text-foreground">
              Quick Actions
            </h2>
            <div className="mt-4 space-y-3">
              <Link
                href="/projects/new"
                className="flex items-center gap-3 rounded-xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <span>+</span>
                <span>New Project</span>
              </Link>
              <Link
                href="/projects"
                className="flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-muted"
              >
                <span>📁</span>
                <span>All Projects</span>
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-muted"
              >
                <span>⚡</span>
                <span>Upgrade Plan</span>
              </Link>
            </div>

            <div className="mt-6 rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How it works</p>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>1. Create a project</li>
                <li>2. Upload your clips</li>
                <li>3. Generate AI metadata</li>
                <li>4. Review &amp; edit</li>
                <li>5. Export CSV</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
