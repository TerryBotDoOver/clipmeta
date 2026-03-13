import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { GenerateMetadataButton } from "@/components/GenerateMetadataButton";
import { MetadataEditor } from "@/components/MetadataEditor";
import { BulkGenerateButton } from "@/components/BulkGenerateButton";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectReviewPage({ params }: ReviewPageProps) {
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
    .select("*, metadata_results(*)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // Generate signed URLs for clips without metadata
  const clipUrls: Record<string, string> = {};
  if (clips) {
    for (const clip of clips) {
      if (!clip.metadata_results && clip.storage_path) {
        const { data } = await supabaseAdmin.storage
          .from("project-uploads")
          .createSignedUrl(clip.storage_path, 600);
        if (data?.signedUrl) clipUrls[clip.id] = data.signedUrl;
      }
    }
  }

  const totalClips = clips?.length ?? 0;
  const withMetadata = clips?.filter((c) => c.metadata_results).length ?? 0;
  const pending = totalClips - withMetadata;

  // Pending clips for bulk generate
  const pendingClips = clips
    ? clips
        .filter((c) => !c.metadata_results && clipUrls[c.id])
        .map((c) => ({ id: c.id, filename: c.original_filename, storageUrl: clipUrls[c.id] }))
    : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">

        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Review Workspace
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {project.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {withMetadata} of {totalClips} clips have metadata.
                {pending > 0 && ` ${pending} pending.`}
              </p>
            </div>
            {pendingClips.length > 0 && (
              <BulkGenerateButton clips={pendingClips} />
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">

          {/* Clip cards */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Review queue</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Inspect and verify generated metadata before export.
                </p>
              </div>
              {withMetadata > 0 && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  {withMetadata} ready
                </span>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {clips && clips.length > 0 ? (
                clips.map((clip) => {
                  const meta = clip.metadata_results;
                  return (
                    <div
                      key={clip.id}
                      className={`rounded-xl border p-4 ${
                        meta ? "border-green-200 bg-green-50/30" : "border-dashed border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {clip.original_filename}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              meta
                                ? "bg-green-100 text-green-700"
                                : clip.metadata_status === "processing"
                                ? "bg-blue-100 text-blue-700"
                                : clip.metadata_status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {meta ? "✓ ready" : clip.metadata_status}
                          </span>
                        </div>
                      </div>

                      {meta ? (
                        <MetadataEditor
                          clipId={clip.id}
                          initial={{
                            title: meta.title ?? "",
                            description: meta.description ?? "",
                            keywords: meta.keywords ?? [],
                            category: meta.category ?? "",
                            location: meta.location,
                            confidence: meta.confidence ?? "medium",
                          }}
                        />
                      ) : (
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-sm text-slate-400 italic">
                            {clip.metadata_status === "processing"
                              ? "Generating metadata…"
                              : "No metadata yet."}
                          </p>
                          {clipUrls[clip.id] && clip.metadata_status !== "processing" && (
                            <GenerateMetadataButton
                              clipId={clip.id}
                              filename={clip.original_filename}
                              storageUrl={clipUrls[clip.id]}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                  No clips yet.{" "}
                  <Link href={`/projects/${id}/upload`} className="font-medium text-slate-700 underline">
                    Upload your first clip
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Summary</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl bg-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total clips</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{totalClips}</p>
                </div>
                <div className="rounded-xl bg-green-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">With metadata</p>
                  <p className="mt-1 text-2xl font-bold text-green-700">{withMetadata}</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">{pending}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Actions</h2>
              <div className="mt-4 space-y-3">
                <Link
                  href={`/projects/${id}/upload`}
                  className="block rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Upload more clips
                </Link>
                <a
                  href={withMetadata > 0 ? `/api/export/csv?project_id=${project.id}` : "#"}
                  className={`block rounded-lg border px-4 py-3 text-center text-sm font-medium transition ${
                    withMetadata > 0
                      ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                      : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  Export CSV {withMetadata > 0 ? `(${withMetadata} clips)` : ""}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
