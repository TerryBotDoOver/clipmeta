import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ExportButton } from "@/components/ExportButton";
import { ProjectCreatedTracker } from "@/components/ProjectCreatedTracker";
import { Platform, PLATFORM_LABELS } from "@/lib/platform-presets";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("*").eq("slug", id).eq("user_id", user.id).single(),
    supabase.from("profiles").select("plan, stripe_subscription_status").eq("id", user.id).single(),
  ]);

  const activeStatuses = ["active", "trialing", "founder"];
  const isActiveSub = activeStatuses.includes(profile?.stripe_subscription_status ?? "");
  const userPlan = (isActiveSub ? profile?.plan : "free") ?? "free";

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
    .select("id, metadata_status, upload_status, original_filename, file_size_bytes, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // Fetch metadata separately for complete clips to avoid join array issues
  const completeClipIds = (clips ?? []).filter(c => c.metadata_status === "complete").map(c => c.id);
  const { data: metaRows } = completeClipIds.length > 0
    ? await supabase.from("metadata_results").select("clip_id, title, description, keywords").in("clip_id", completeClipIds)
    : { data: [] };
  const metaByClipId = Object.fromEntries((metaRows ?? []).map(m => [m.clip_id, m]));

  const totalClips = clips?.length ?? 0;
  const withMeta = clips?.filter((c) => c.metadata_status === "complete").length ?? 0;
  const pending = totalClips - withMeta;

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <ProjectCreatedTracker />
      </Suspense>
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/projects" className="text-xs font-medium text-muted-foreground hover:text-foreground transition">
              ← All projects
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {project.name}
            </h1>
            {project.platform && (
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {PLATFORM_LABELS[project.platform as Platform] ?? "Generic / Other"}
              </span>
            )}
            {project.description && (
              <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Created {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className="inline-flex self-start rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:self-auto">
            {project.status ?? "active"}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground">Total Clips</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{totalClips}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground">Metadata Done</p>
            <p className="mt-2 text-3xl font-bold text-green-500">{withMeta}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">{pending}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            href={`/projects/${id}/upload`}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-foreground px-4 py-4 text-sm font-semibold text-background transition hover:opacity-80"
          >
            📤 Upload Clips
          </Link>
          <Link
            href={`/projects/${id}/review`}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            🔍 Review &amp; Edit
          </Link>
          <div className="flex items-center justify-center">
            <ExportButton
              projectId={project.id}
              clipCount={withMeta}
              plan={userPlan}
              clips={(clips ?? []).filter((c) => c.metadata_status === "complete" && metaByClipId[c.id]).map((c) => ({
                filename: c.original_filename ?? '',
                title: metaByClipId[c.id]?.title ?? '',
                description: metaByClipId[c.id]?.description ?? '',
                keywords: metaByClipId[c.id]?.keywords ?? [],
              }))}
            />
          </div>
        </div>

        {/* Clip list */}
        {clips && clips.length > 0 && (
          <section className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Clips</h2>
            <div className="space-y-2">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{clip.original_filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {clip.file_size_bytes
                        ? `${(clip.file_size_bytes / 1024 / 1024).toFixed(1)} MB`
                        : "—"}{" "}
                      · {new Date(clip.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      clip.metadata_status === "complete"
                        ? "bg-green-500/15 text-green-400"
                        : clip.metadata_status === "processing"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-amber-500/15 text-amber-400"
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
