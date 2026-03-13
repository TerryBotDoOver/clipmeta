import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function ProjectsPage() {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Projects
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Manage your metadata projects
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Projects hold your clip uploads, metadata generation runs, review work,
              and export history.
            </p>
          </div>

          <Link
            href="/projects/new"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Create project
          </Link>
        </div>

        <section className="mt-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Database status</h2>
            <p className="mt-2 text-sm text-slate-600">
              {error
                ? `Error loading projects: ${error.message}`
                : `Projects loaded: ${projects?.length ?? 0}`}
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {project.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Slug: {project.slug}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {project.status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {project.description || "No description yet."}
                </p>

                <div className="mt-6 text-sm font-medium text-slate-900">
                  Open project →
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
              No projects found yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}