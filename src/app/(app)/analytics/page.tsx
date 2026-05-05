import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPlanDisplayName, getUsagePeriodStart, normalizeEntitlementPlan, PLANS } from "@/lib/plans";

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  created_at: string;
};

type ClipRow = {
  id: string;
  project_id: string;
  metadata_status: string | null;
  upload_status: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

type HistoryRow = {
  created_at: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [
    { data: projects },
    { data: profile, error: profileError },
    { count: lifetimeUploads },
  ] = await Promise.all([
    supabaseAdmin
      .from("projects")
      .select("id, slug, name, status, created_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("plan, billing_period_start, bonus_clips, rollover_clips, regens_used_this_month, referral_pro_forever, referral_pro_until")
      .eq("id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("clip_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "created"),
  ]);

  if (profileError) {
    throw new Error(`Failed to load analytics profile: ${profileError.message}`);
  }

  const projectRows = (projects ?? []) as ProjectRow[];
  const projectIds = projectRows.map((project) => project.id);
  const now = new Date();
  const planFromProfile = profile?.plan as string | null | undefined;
  const entitlementPlan = normalizeEntitlementPlan(
    profile?.referral_pro_forever ||
      (profile?.referral_pro_until && new Date(profile.referral_pro_until as string) > now)
      ? "pro"
      : planFromProfile
  );
  const planInfo = entitlementPlan === "founder" ? null : PLANS[entitlementPlan];
  const displayPlanName =
    entitlementPlan === "founder"
      ? "Founder"
      : entitlementPlan !== normalizeEntitlementPlan(planFromProfile)
        ? PLANS[entitlementPlan].name
        : getPlanDisplayName(planFromProfile);
  const bonusClips = (profile?.bonus_clips as number | null) ?? 0;
  const rolloverClips = (profile?.rollover_clips as number | null) ?? 0;
  const monthlyLimit = planInfo ? planInfo.clips + (planInfo.period === "monthly" ? bonusClips + rolloverClips : 0) : null;
  const regensLimit = planInfo?.regens ?? null;
  const regensUsed = (profile?.regens_used_this_month as number | null) ?? 0;
  const usagePeriodStart = getUsagePeriodStart(planFromProfile, profile?.billing_period_start as string | null | undefined, now);
  const thirtyDaysAgoDate = new Date(now);
  thirtyDaysAgoDate.setDate(now.getDate() - 30);
  const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();

  const [
    { data: clips },
    { count: clipsThisPeriod },
    { data: recentHistory },
  ] = projectIds.length > 0
    ? await Promise.all([
        supabaseAdmin
          .from("clips")
          .select("id, project_id, metadata_status, upload_status, file_size_bytes, created_at")
          .in("project_id", projectIds),
        supabaseAdmin
          .from("clip_history")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("action", "created")
          .gte("created_at", usagePeriodStart.toISOString()),
        supabaseAdmin
          .from("clip_history")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("action", "created")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: true }),
      ])
    : [
        { data: [] as ClipRow[] },
        { count: 0 },
        { data: [] as HistoryRow[] },
      ];

  const clipRows = (clips ?? []) as ClipRow[];
  const activeClips = clipRows.length;
  const withMetadata = clipRows.filter((clip) => clip.metadata_status === "complete").length;
  const processingClips = clipRows.filter((clip) => clip.metadata_status === "processing").length;
  const failedClips = clipRows.filter((clip) => clip.metadata_status === "failed").length;
  const uploadedClips = clipRows.filter((clip) => clip.upload_status === "uploaded").length;
  const totalStorage = clipRows.reduce((sum, clip) => sum + (clip.file_size_bytes ?? 0), 0);
  const usagePct = monthlyLimit ? percent(clipsThisPeriod ?? 0, monthlyLimit) : 0;
  const regenPct = regensLimit ? percent(regensUsed, regensLimit) : 0;

  const projectStats = projectRows
    .map((project) => {
      const projectClips = clipRows.filter((clip) => clip.project_id === project.id);
      const ready = projectClips.filter((clip) => clip.metadata_status === "complete").length;
      const size = projectClips.reduce((sum, clip) => sum + (clip.file_size_bytes ?? 0), 0);
      return {
        ...project,
        clipCount: projectClips.length,
        readyCount: ready,
        storage: size,
      };
    })
    .sort((a, b) => b.clipCount - a.clipCount)
    .slice(0, 6);

  const dayBuckets = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: shortDate(date), count: 0 };
  });
  const bucketByKey = new Map(dayBuckets.map((bucket) => [bucket.key, bucket]));
  ((recentHistory ?? []) as HistoryRow[]).forEach((row) => {
    const key = new Date(row.created_at).toISOString().slice(0, 10);
    const bucket = bucketByKey.get(key);
    if (bucket) bucket.count += 1;
  });
  const maxDailyUploads = Math.max(1, ...dayBuckets.map((bucket) => bucket.count));

  return (
    <main className="flex-1 p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Analytics</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Account analytics</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Usage, clip activity, and project health for your ClipMeta workspace.
        </p>
      </div>

      <section id="active-clips" className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active clips</p>
          <p className="mt-3 text-3xl font-bold text-foreground">{formatNumber(activeClips)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatNumber(uploadedClips)} uploaded and available</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">With metadata</p>
          <p className="mt-3 text-3xl font-bold text-foreground">{formatNumber(withMetadata)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{percent(withMetadata, activeClips)}% ready for review/export</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Storage uploaded</p>
          <p className="mt-3 text-3xl font-bold text-foreground">{formatBytes(totalStorage)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across {formatNumber(projectRows.length)} active projects</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</p>
          <p className="mt-3 text-3xl font-bold text-foreground">{displayPlanName}</p>
          <Link href="/settings" className="mt-1 inline-block text-xs font-semibold text-primary hover:text-primary/80">
            Manage settings &rarr;
          </Link>
        </div>
      </section>

      <section id="upload-history" className="mt-6 grid gap-5 grid-cols-1 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Monthly allowance</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Current usage period started {usagePeriodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
              </p>
            </div>
            <Link href="/settings" className="text-xs font-semibold text-primary hover:text-primary/80">
              Settings &rarr;
            </Link>
          </div>
          <div className="mt-5">
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(clipsThisPeriod ?? 0)}
                <span className="text-base font-medium text-muted-foreground">
                  {monthlyLimit ? ` / ${formatNumber(monthlyLimit)}` : " / unlimited"}
                </span>
              </p>
              {monthlyLimit && <p className="text-sm font-semibold text-primary">{Math.min(usagePct, 100)}%</p>}
            </div>
            {monthlyLimit && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(usagePct, 100)}%` }} />
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lifetime uploads</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{formatNumber(lifetimeUploads ?? 0)}</p>
              </div>
              <div className="rounded-lg bg-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Regenerations</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {formatNumber(regensUsed)}
                  <span className="text-sm font-medium text-muted-foreground">
                    {regensLimit ? ` / ${formatNumber(regensLimit)}` : " / unlimited"}
                  </span>
                </p>
                {regensLimit && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(regenPct, 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Upload activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">Last 14 days of created clip records.</p>
          <div className="mt-5 flex h-48 items-end gap-2">
            {dayBuckets.map((bucket) => (
              <div key={bucket.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end rounded bg-muted/50">
                  <div
                    className="w-full rounded bg-primary/80"
                    style={{ height: `${Math.max(6, (bucket.count / maxDailyUploads) * 100)}%` }}
                    title={`${bucket.label}: ${bucket.count} uploads`}
                  />
                </div>
                <p className="hidden text-[10px] text-muted-foreground sm:block">{bucket.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 grid-cols-1 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Clip status</h2>
          <div className="mt-4 space-y-3">
            {[
              { label: "Ready", value: withMetadata, color: "bg-emerald-500" },
              { label: "Processing", value: processingClips, color: "bg-primary" },
              { label: "Needs attention", value: failedClips, color: "bg-red-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{formatNumber(item.value)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent(item.value, activeClips)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-foreground">Top projects by clips</h2>
            <Link href="/projects" className="text-xs font-semibold text-primary hover:text-primary/80">
              All projects &rarr;
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {projectStats.length > 0 ? (
              projectStats.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="grid gap-3 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{project.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString()} · {project.status ?? "active"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatNumber(project.readyCount)}</span> ready
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatNumber(project.clipCount)}</span> clips · {formatBytes(project.storage)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No project activity yet.</p>
                <Link href="/projects/new" className="mt-2 inline-block text-sm font-semibold text-primary hover:text-primary/80">
                  Create a project &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
