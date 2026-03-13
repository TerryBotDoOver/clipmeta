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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Projects</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{projectCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Clips Uploaded</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{totalClips ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Metadata Generated</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{totalMeta ?? 0}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* Recent projects */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Projects</h2>
              <Link href="/projects" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                View all →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {projects && projects.length > 0 ? (
                projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {p.status}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No projects yet.{" "}
                  <Link href="/projects/new" className="font-medium text-slate-900 underline">
                    Create your first →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-4 text-lg font-semibold text-slate-900">
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
                className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span>📁</span>
                <span>All Projects</span>
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span>⚡</span>
                <span>Upgrade Plan</span>
              </Link>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How it works</p>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
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
