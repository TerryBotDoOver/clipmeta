import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getR2ReadUrl } from "@/lib/r2";
import { BulkGenerateButton } from "@/components/BulkGenerateButton";
import { ExportButton } from "@/components/ExportButton";
import { MarkCompleteButton } from "@/components/MarkCompleteButton";
import { ReviewQueue } from "@/components/ReviewQueue";
import { BlackboxFtpButton } from "@/components/BlackboxFtpButton";
import { ClipLimitWarning } from "@/components/ClipLimitWarning";
import { ProjectMetaCard } from "@/components/ProjectMetaCard";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectReviewPage({ params }: ReviewPageProps) {
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

  const { data: rawClips } = await supabase
    .from("clips")
    .select("*, metadata_results(*)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // Flatten metadata_results from array to single object (match polling API format)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clips = (rawClips || []).map((c: any) => ({
    ...c,
    metadata_results: Array.isArray(c.metadata_results)
      ? c.metadata_results.length > 0 ? c.metadata_results[0] : null
      : c.metadata_results,
  })) as typeof rawClips;

  // Generate signed read URLs for all clips with a storage path
  // Skip clips whose source has been archived (upload_status = "source_deleted")
  // so the UI knows to show the "archived" state instead of a broken video.
  const clipUrls: Record<string, string> = {};
  if (clips) {
    for (const clip of clips) {
      if (clip.storage_path && clip.upload_status !== "source_deleted") {
        try {
          clipUrls[clip.id] = await getR2ReadUrl(clip.storage_path, 86400); // 24h expiry
        } catch {
          // skip if URL generation fails (e.g. video already deleted)
        }
      }
    }
  }

  // Look up which clips have a previous-version snapshot available.
  // Used by ReviewQueue to show the "Previous version" revert button.
  const clipsWithHistory = new Set<string>();
  if (clips && clips.length > 0) {
    const { data: historyRows } = await supabase
      .from("metadata_history")
      .select("clip_id")
      .in("clip_id", clips.map((c) => c.id));
    for (const row of historyRows ?? []) clipsWithHistory.add(row.clip_id as string);
  }

  const totalClips = clips?.length ?? 0;
  const withMetadata = clips?.filter((c) => c.metadata_results).length ?? 0;
  const pending = totalClips - withMetadata;

  // ─── Archive countdown ────────────────────────────────────────────────────
  // R2 auto-archives uploaded source files after 21 days. Compute, for each
  // still-active clip, days remaining until its source disappears. Show a
  // subtle pill at ≤7 days and a prominent warning at ≤3 days. Already-archived
  // clips are counted separately so we can mention them if any exist.
  const ARCHIVE_DAYS = 21;
  const now = Date.now();
  let soonestDaysLeft: number | null = null;
  let clipsExpiringIn7Days = 0;
  let archivedCount = 0;
  for (const c of clips ?? []) {
    if (c.upload_status === "source_deleted") {
      archivedCount += 1;
      continue;
    }
    if (!c.storage_path || !c.created_at) continue;
    const ageMs = now - new Date(c.created_at).getTime();
    const ageDays = ageMs / 86_400_000;
    const daysLeft = Math.ceil(ARCHIVE_DAYS - ageDays);
    if (daysLeft < 0) continue; // overdue but not yet flipped — skip in countdown
    if (soonestDaysLeft === null || daysLeft < soonestDaysLeft) soonestDaysLeft = daysLeft;
    if (daysLeft <= 7) clipsExpiringIn7Days += 1;
  }
  const showArchiveBanner =
    archivedCount > 0 || (soonestDaysLeft !== null && soonestDaysLeft <= 7);
  const archiveBannerSeverity: "info" | "warn" | "danger" =
    soonestDaysLeft !== null && soonestDaysLeft <= 3 ? "danger"
    : soonestDaysLeft !== null && soonestDaysLeft <= 7 ? "warn"
    : "info";
  // ──────────────────────────────────────────────────────────────────────────

  // Keyword analytics (computed server-side from existing data)
  const clipsWithMeta = clips?.filter((c) => c.metadata_results) ?? [];
  const keywordFreq = clipsWithMeta
    .flatMap((c) => (c.metadata_results?.keywords as string[] | undefined) ?? [])
    .reduce<Record<string, number>>((acc, kw) => {
      acc[kw] = (acc[kw] ?? 0) + 1;
      return acc;
    }, {});
  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const duplicateKeywordCount = Object.values(keywordFreq).filter((v) => v > 1).length;
  const avgKeywordCount =
    clipsWithMeta.length > 0
      ? Math.round(
          clipsWithMeta.reduce(
            (sum, c) => sum + ((c.metadata_results?.keywords as string[] | undefined)?.length ?? 0),
            0
          ) / clipsWithMeta.length
        )
      : 0;
  const lowKeywordClips = clipsWithMeta.filter(
    (c) => ((c.metadata_results?.keywords as string[] | undefined)?.length ?? 0) < 15
  ).length;

  const pendingClips = clips
    ? clips
        .filter((c) => !c.metadata_results && c.metadata_status !== "failed" && clipUrls[c.id])
        .map((c) => ({ id: c.id, filename: c.original_filename, storageUrl: clipUrls[c.id], fileSize: c.file_size_bytes ?? 0 }))
    : [];

  const failedClips = clips
    ? clips
        .filter((c) => c.metadata_status === "failed" && clipUrls[c.id])
        .map((c) => ({ id: c.id, filename: c.original_filename, storageUrl: clipUrls[c.id], fileSize: c.file_size_bytes ?? 0 }))
    : [];

  const EXPORT_PLATFORMS = [
    { key: "blackbox", label: "Blackbox.global", primary: true },
    { key: "shutterstock", label: "Shutterstock", primary: false },
    { key: "adobe", label: "Adobe Stock", primary: false },
    { key: "pond5", label: "Pond5", primary: false },
    { key: "generic", label: "Generic CSV", primary: false },
  ] as const;

  // userPlan resolved above with activeStatuses check

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">

        {/* Clip limit warning (shows only when at 80%+ of monthly limit) */}
        <ClipLimitWarning />

        {/* Archive countdown — appears when any clip's source is ≤7 days from
            being archived from R2, or when some have already been archived.
            Metadata is preserved permanently; only the playable source goes. */}
        {showArchiveBanner && (
          <div
            className={
              "rounded-2xl border px-4 py-3 text-sm sm:px-5 " +
              (archiveBannerSeverity === "danger"
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : archiveBannerSeverity === "warn"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-border bg-card text-muted-foreground")
            }
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 text-base leading-none">📦</span>
              <div className="space-y-1 leading-relaxed">
                {soonestDaysLeft !== null && soonestDaysLeft <= 7 && (
                  <p>
                    <span className="font-semibold">
                      {clipsExpiringIn7Days} clip{clipsExpiringIn7Days === 1 ? "" : "s"}{" "}
                      {soonestDaysLeft <= 0 ? "are being archived now" : `archive in ${soonestDaysLeft} day${soonestDaysLeft === 1 ? "" : "s"}`}.
                    </span>{" "}
                    Generate metadata and export before then — your saved metadata stays forever, but the playable source files won&apos;t.
                  </p>
                )}
                {archivedCount > 0 && (
                  <p className="text-xs opacity-90">
                    {archivedCount} clip{archivedCount === 1 ? " has" : "s have"} already been archived. Their metadata is intact; re-upload the source if you need to regenerate.
                  </p>
                )}
                <p className="text-xs opacity-75">
                  Sources are auto-archived 21 days after upload to keep storage costs low.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Review Workspace
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {withMetadata} of {totalClips} clips have metadata.
                {pending > 0 && ` ${pending} pending.`}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {(pendingClips.length > 0 || failedClips.length > 0) && (
                <BulkGenerateButton clips={pendingClips} failedClips={failedClips} />
              )}
              <ExportButton
                projectId={project.id}
                clipCount={withMetadata}
                plan={userPlan}
                clips={clipsWithMeta.map((c) => ({
                  filename: c.original_filename ?? '',
                  title: (c.metadata_results?.title as string) ?? '',
                  description: (c.metadata_results?.description as string) ?? '',
                  keywords: (c.metadata_results?.keywords as string[]) ?? [],
                }))}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 xl:grid-cols-[1.4fr_0.9fr]">

          {/* Clip cards */}
          <section className="min-w-0 rounded-2xl border border-border bg-card p-6">
            {clips && clips.length > 0 ? (
              <ReviewQueue
                clips={clips ?? []}
                clipUrls={clipUrls}
                clipsWithHistory={Array.from(clipsWithHistory)}
                pendingClips={pendingClips}
                projectId={project.id}
                plan={userPlan}
                projectLocation={project.location ?? null}
                projectShootingDate={project.shooting_date ?? null}
                pinnedKeywords={project.pinned_keywords ?? null}
                pinnedKeywordsPosition={project.pinned_keywords_position ?? null}
                projectIsEditorial={project.is_editorial ?? false}
                projectEditorialText={project.editorial_text ?? null}
                projectEditorialCity={project.editorial_city ?? null}
                projectEditorialState={project.editorial_state ?? null}
                projectEditorialCountry={project.editorial_country ?? null}
                projectEditorialDate={project.editorial_date ?? null}
              />
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
          </section>

          {/* Sidebar */}
          <aside className="flex min-w-0 flex-col gap-4">

            {/* Stats */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-muted px-3 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{totalClips}</p>
                </div>
                <div className="rounded-xl bg-muted px-3 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ready</p>
                  <p className="mt-1 text-2xl font-bold text-green-500">{withMetadata}</p>
                </div>
                <div className="rounded-xl bg-muted px-3 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
                  <p className="mt-1 text-2xl font-bold text-amber-400">{pending}</p>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Export</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Platform-optimized CSV — click any format to preview before downloading.
              </p>
              <div className="mt-4">
                <ExportButton
                  projectId={project.id}
                  clipCount={withMetadata}
                  plan={userPlan}
                  clips={clipsWithMeta.map((c) => ({
                    filename: c.original_filename ?? '',
                    title: (c.metadata_results?.title as string) ?? '',
                    description: (c.metadata_results?.description as string) ?? '',
                    keywords: (c.metadata_results?.keywords as string[]) ?? [],
                  }))}
                />
              </div>
              {withMetadata === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Generate metadata on at least one clip to enable export.
                </p>
              )}
            </div>

            {/* Blackbox FTP Transfer */}
            {withMetadata > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">Send to Blackbox</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  FTP your clips directly to your Blackbox account. Files will appear in your Blackbox Workspace within minutes.
                </p>
                <div className="mt-4">
                  <BlackboxFtpButton projectId={project.id} clipCount={withMetadata} userPlan={userPlan} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  After transfer, import the CSV in Blackbox to apply metadata.
                </p>
              </div>
            )}

            {/* Keyword Tools */}
            {clipsWithMeta.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">Keyword Tools</h2>
                <p className="mt-1 text-xs text-muted-foreground">Quality analysis across all clips.</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Avg / clip</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{avgKeywordCount}</p>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Duplicates</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{duplicateKeywordCount}</p>
                  </div>
                </div>

                {lowKeywordClips > 0 && (
                  <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400">
                    {lowKeywordClips} clip{lowKeywordClips > 1 ? "s" : ""} with fewer than 15 keywords
                  </p>
                )}

                {topKeywords.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top keywords</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {topKeywords.map(([kw, count]) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-foreground"
                        >
                          {kw}
                          <span className="text-[10px] text-muted-foreground">×{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Project Settings */}
            <ProjectMetaCard
              projectId={project.id}
              initialPinnedKeywords={project.pinned_keywords ?? null}
              initialPinnedKeywordsPosition={project.pinned_keywords_position ?? null}
              initialLocation={project.location ?? null}
              initialShootingDate={project.shooting_date ?? null}
              initialIsEditorial={project.is_editorial ?? false}
              initialEditorialText={project.editorial_text ?? null}
              initialEditorialCity={project.editorial_city ?? null}
              initialEditorialState={project.editorial_state ?? null}
              initialEditorialCountry={project.editorial_country ?? null}
              initialEditorialDate={project.editorial_date ?? null}
            />

            {/* Actions */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Actions</h2>
              <div className="mt-4 space-y-2">
                <Link
                  href={`/projects/${id}/upload`}
                  className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Upload more clips
                </Link>
                <MarkCompleteButton
                  projectId={project.id}
                  projectSlug={project.slug}
                  isComplete={project.status === "complete"}
                />
              </div>
            </div>

          </aside>
        </div>
      </div>
    </main>
  );
}
