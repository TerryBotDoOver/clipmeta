import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getR2ReadUrl } from "@/lib/r2";
import { GenerateMetadataButton } from "@/components/GenerateMetadataButton";
import { MetadataEditor } from "@/components/MetadataEditor";
import { BulkGenerateButton } from "@/components/BulkGenerateButton";
import { ExportButton } from "@/components/ExportButton";
import { QualityBadge } from "@/components/QualityBadge";

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
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-sm text-muted-foreground">Project not found.</p>
          <Link href="/projects" className="mt-4 inline-block text-sm font-medium text-foreground underline">
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

  // Generate signed read URLs for clips without metadata
  const clipUrls: Record<string, string> = {};
  if (clips) {
    for (const clip of clips) {
      if (!clip.metadata_results && clip.storage_path) {
        try {
          clipUrls[clip.id] = await getR2ReadUrl(clip.storage_path, 3600);
        } catch {
          // skip if URL generation fails
        }
      }
    }
  }

  const totalClips = clips?.length ?? 0;
  const withMetadata = clips?.filter((c) => c.metadata_results).length ?? 0;
  const pending = totalClips - withMetadata;

  const pendingClips = clips
    ? clips
        .filter((c) => !c.metadata_results && clipUrls[c.id])
        .map((c) => ({ id: c.id, filename: c.original_filename, storageUrl: clipUrls[c.id] }))
    : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Review Workspace
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {withMetadata} of {totalClips} clips have metadata.
                {pending > 0 && ` ${pending} pending.`}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {pendingClips.length > 0 && <BulkGenerateButton clips={pendingClips} />}
              <ExportButton projectId={project.id} clipCount={withMetadata} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">

          {/* Clip cards */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Review queue</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Inspect and edit metadata before export.
                </p>
              </div>
              {withMetadata > 0 && (
                <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-400">
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
                      className={`rounded-xl border p-4 transition ${
                        meta
                          ? "border-green-500/20 bg-muted/20"
                          : "border-dashed border-border"
                      }`}
                    >
                      {/* Clip header */}
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-foreground truncate max-w-[60%]">
                          {clip.original_filename}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          {meta && (
                            <QualityBadge
                              title={meta.title ?? ""}
                              description={meta.description ?? ""}
                              keywords={meta.keywords ?? []}
                              category={meta.category ?? ""}
                              location={meta.location}
                            />
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              meta
                                ? "bg-green-500/15 text-green-400"
                                : clip.metadata_status === "processing"
                                ? "bg-blue-500/15 text-blue-400"
                                : clip.metadata_status === "failed"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-amber-500/15 text-amber-400"
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
                          <p className="text-sm text-muted-foreground italic">
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
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No clips yet.</p>
                  <Link
                    href={`/projects/${id}/upload`}
                    className="mt-2 inline-block text-sm font-medium text-foreground underline"
                  >
                    Upload your first clip
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            {/* Stats */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Summary</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl bg-muted px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total clips</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{totalClips}</p>
                </div>
                <div className="rounded-xl bg-muted px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">With metadata</p>
                  <p className="mt-1 text-2xl font-bold text-green-500">{withMetadata}</p>
                </div>
                <div className="rounded-xl bg-muted px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
                  <p className="mt-1 text-2xl font-bold text-amber-400">{pending}</p>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Export</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Platform-optimized CSV — each format matches the target site&apos;s exact requirements.
              </p>
              <div className="mt-4 space-y-2">
                {(["blackbox", "shutterstock", "adobe", "pond5", "generic"] as const).map((p) => {
                  const labels: Record<string, string> = {
                    blackbox: "Blackbox.global",
                    shutterstock: "Shutterstock",
                    adobe: "Adobe Stock",
                    pond5: "Pond5",
                    generic: "Generic CSV",
                  };
                  return (
                    <a
                      key={p}
                      href={withMetadata > 0 ? `/api/export/csv?project_id=${project.id}&platform=${p}` : "#"}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                        withMetadata > 0
                          ? "border-border text-foreground hover:bg-muted"
                          : "cursor-not-allowed border-border text-muted-foreground opacity-40"
                      }`}
                    >
                      <span>{labels[p]}</span>
                      {p === "blackbox" && withMetadata > 0 && (
                        <span className="text-xs text-indigo-400">★ primary</span>
                      )}
                    </a>
                  );
                })}
              </div>
              {withMetadata === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">Generate metadata on at least one clip to enable export.</p>
              )}
            </div>

            {/* Upload more */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Actions</h2>
              <div className="mt-4">
                <Link
                  href={`/projects/${id}/upload`}
                  className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Upload more clips
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
