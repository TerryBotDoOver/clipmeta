import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Projects
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Your metadata projects
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Projects hold your clip uploads, metadata generation runs, review work,
              and export history.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            + New project
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-muted px-4 py-3 text-sm text-red-700">
            Error loading projects: {error.message}
          </div>
        )}

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {project.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {project.status ?? "active"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {project.description || "No description yet."}
                </p>
                <div className="mt-6 text-sm font-medium text-primary">
                  Open project →
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              No projects yet.{" "}
              <Link href="/projects/new" className="font-medium text-primary underline hover:text-primary/80">
                Create your first one →
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
