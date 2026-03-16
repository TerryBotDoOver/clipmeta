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

  const stats = [
    { label: "Projects", value: projectCount, icon: "⊞", hint: "Active batches" },
    { label: "Clips Uploaded", value: totalClips ?? 0, icon: "▶", hint: "Total footage" },
    { label: "Metadata Generated", value: totalMeta ?? 0, icon: "✦", hint: "AI-tagged clips" },
  ];

  return (
    <main className="flex-1 p-8">
      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Dashboard</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm">{s.icon}</span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Recent projects */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
            <Link href="/projects" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              View all →
            </Link>
          </div>
          <div className="p-3 space-y-1">
            {projects && projects.length > 0 ? (
              projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.slug}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
                    {p.status}
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No projects yet.</p>
                <Link href="/projects/new" className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary/80">
                  Create your first project →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            <Link
              href="/projects/new"
              className="flex items-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span>+</span>
              New Project
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <span>⊞</span>
              All Projects
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <span>⚡</span>
              Upgrade Plan
            </Link>
          </div>
          <div className="mx-4 mb-4 rounded-lg bg-muted p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">How it works</p>
            <ol className="mt-3 space-y-1.5">
              {["Create a project", "Upload your clips", "Generate AI metadata", "Review & edit", "Export CSV"].map((step, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
