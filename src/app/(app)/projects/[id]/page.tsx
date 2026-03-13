import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-sm text-slate-500">Project not found.</p>
          <Link href="/projects" className="mt-4 inline-block text-sm font-medium text-slate-900 underline">
            Back to projects
          </Link>
        </div>
      </main>
    );
  }

  const { data: clips } = await supabase
    .from("clips")
    .select("id, metadata_status, upload_status, original_filename, file_size_bytes, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const totalClips = clips?.length ?? 0;
  const withMeta = clips?.filter((c) => c.metadata_status === "complete").length ?? 0;
  const pending = totalClips - withMeta;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/projects" className="text-xs font-medium text-slate-400 hover:text-slate-600">
              ← All projects
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-2 text-sm text-slate-600">{project.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Created {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className="inline-flex self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:self-auto">
            {project.status ?? "active"}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Clips</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalClips}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Metadata Done</p>
            <p className="mt-2 text-3xl font-bold text-green-700">{withMeta}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Pending</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{pending}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            href={`/projects/${id}/upload`}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-slate-900 px-4 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            📤 Upload Clips
          </Link>
          <Link
            href={`/projects/${id}/review`}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            🔍 Review &amp; Edit
          </Link>
          <a
            href={withMeta > 0 ? `/api/export/csv?project_id=${project.id}` : "#"}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-4 text-sm font-semibold transition ${
              withMeta > 0
                ? "border-green-600 bg-green-50 text-green-800 hover:bg-green-100"
                : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            📋 Export CSV {withMeta > 0 ? `(${withMeta})` : ""}
          </a>
        </div>

        {/* Clip list */}
        {clips && clips.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Clips</h2>
            <div className="space-y-2">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{clip.original_filename}</p>
                    <p className="text-xs text-slate-400">
                      {clip.file_size_bytes
                        ? `${(clip.file_size_bytes / 1024 / 1024).toFixed(1)} MB`
                        : "—"}{" "}
                      · {new Date(clip.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      clip.metadata_status === "complete"
                        ? "bg-green-100 text-green-700"
                        : clip.metadata_status === "processing"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {clip.metadata_status === "complete" ? "✓ ready" : clip.metadata_status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
