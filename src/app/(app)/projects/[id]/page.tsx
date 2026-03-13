import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", id)
    .single();

  const { data: clips, error: clipsError } = project
    ? await supabase
        .from("clips")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
    : { data: null, error: null };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Project Detail
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {project ? project.name : `Project: ${id}`}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {project?.description ||
                "This is a frontend-first project detail page that is now reading its project record from Supabase."}
            </p>
          </div>
        </div>

        <section className="mt-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Database status</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Slug:</span> {id}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Record found:</span>{" "}
                {project ? "yes" : "no"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Project error:</span>{" "}
                {error ? error.message : "none"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Clips loaded:</span>{" "}
                {clips?.length ?? 0}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Clips error:</span>{" "}
                {clipsError ? clipsError.message : "none"}
              </p>
              {project && (
                <>
                  <p>
                    <span className="font-semibold text-slate-900">Status:</span>{" "}
                    {project.status}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Created:</span>{" "}
                    {project.created_at}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Uploads</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {clips?.length ?? 0}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Uploaded clips for this project will appear here.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Metadata Jobs</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
            <p className="mt-2 text-sm text-slate-600">
              Metadata generation runs will be tracked here later.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Exports</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
            <p className="mt-2 text-sm text-slate-600">
              CSV (comma-separated values) exports for this project will appear here later.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Upload Area</h2>
            <p className="mt-2 text-sm text-slate-600">
              This placeholder section marks where drag-and-drop clip uploads,
              file list review, and upload progress will go.
            </p>

            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                Upload area placeholder
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Future drag-and-drop upload experience goes here.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Project Actions</h2>

            <div className="mt-4 space-y-3">
              <Link
                href={`/projects/${id}/upload`}
                className="block w-full rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Add Uploads
              </Link>

              <Link
                href={`/projects/${id}/review`}
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open review workspace
              </Link>

              <button
                type="button"
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700"
              >
                Export CSV
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              These are placeholder actions only. No upload or export backend logic is connected yet.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Project Clips</h2>
          <p className="mt-2 text-sm text-slate-600">
            This is the first real clip list loaded from Supabase for the selected project.
          </p>

          <div className="mt-6 space-y-3">
            {clips && clips.length > 0 ? (
              clips.map((clip) => (
                <div
                  key={clip.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {clip.original_filename}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Upload status: {clip.upload_status}
                  </p>
                  <p className="text-sm text-slate-600">
                    Metadata status: {clip.metadata_status}
                  </p>
                  <p className="text-sm text-slate-600">
                    Duration: {clip.duration_seconds ?? "unknown"} seconds
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-400">
                No clips found for this project yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}