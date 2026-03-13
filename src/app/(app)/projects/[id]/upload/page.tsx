import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { UploadForm } from "@/components/UploadForm";

type UploadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectUploadPage({ params }: UploadPageProps) {
  const { id } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", id)
    .single();

  const { data: clips } = project
    ? await supabase
        .from("clips")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
    : { data: null };

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Project not found: {id}</p>
            <Link
              href="/projects"
              className="mt-4 inline-block text-sm font-medium text-slate-900 underline"
            >
              Back to projects
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">

        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Upload Workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {project.name}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Upload video clips for this project. Files are sent directly to
            storage — no size limits from the server.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

          {/* Upload form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl font-semibold text-slate-900">Upload a clip</h2>
              <p className="mt-1 text-sm text-slate-600">
                Supports large video files. Uploads directly to Supabase Storage.
              </p>
            </div>
            <div className="mt-6">
              <UploadForm
                projectId={project.id}
                projectSlug={project.slug}
              />
            </div>
          </section>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Navigation</h2>
              <div className="mt-4 space-y-3">
                <Link
                  href={`/projects/${id}`}
                  className="block rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Back to project
                </Link>
                <Link
                  href={`/projects/${id}/review`}
                  className="block rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Review workspace
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Clips</h2>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {clips?.length ?? 0}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                clips uploaded to this project
              </p>
            </div>
          </aside>
        </div>

        {/* Clip list */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Uploaded clips
          </h2>

          <div className="mt-6 space-y-3">
            {clips && clips.length > 0 ? (
              clips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {clip.original_filename}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {clip.file_size_bytes
                        ? `${(clip.file_size_bytes / 1024 / 1024).toFixed(1)} MB`
                        : "Size unknown"}{" "}
                      · {clip.storage_path}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {clip.upload_status}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {clip.metadata_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                No clips uploaded yet. Add your first clip above.
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
