import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { UploadForm } from "@/components/UploadForm";
import { UppyUploadForm } from "@/components/UppyUploadForm";
import { PLAN_FILE_SIZE_LIMITS, formatFileSize, getPlanDisplayName, normalizePlan } from "@/lib/plans";

type UploadPageProps = {
  params: Promise<{ id: string }>;
};

const UPPY_UPLOAD_EXPERIMENT_USER_IDS = new Set(["93f38fdf-4506-4dfc-89a2-28767bc0b37d"]);
const UPPY_UPLOAD_EXPERIMENT_EMAILS = new Set(["dabears4389@gmail.com"]);

export default async function ProjectUploadPage({ params }: UploadPageProps) {
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

  // Get user's plan for file size limits — include trialing and founder statuses
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_status")
    .eq("id", user.id)
    .single();
  const activeStatuses = ["active", "trialing", "founder"];
  const isActiveSub = activeStatuses.includes(profile?.stripe_subscription_status ?? "");
  const rawPlan = isActiveSub ? profile?.plan : "free";
  const userPlan = normalizePlan(rawPlan);
  const planLabel = getPlanDisplayName(rawPlan);
  const maxFileSizeBytes = PLAN_FILE_SIZE_LIMITS[userPlan];
  const useUppyUploadExperiment =
    UPPY_UPLOAD_EXPERIMENT_USER_IDS.has(user.id) ||
    UPPY_UPLOAD_EXPERIMENT_EMAILS.has(user.email?.toLowerCase() ?? "");

  const { data: clips } = await supabase
    .from("clips")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const clipCount = clips?.length ?? 0;
  const withMeta = clips?.filter((c) => c.metadata_status === "complete").length ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">

        {/* Header — project info + clips count + nav all in one bar */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: title */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Upload</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Files go directly to storage. Max file size: {formatFileSize(maxFileSizeBytes)} on your {planLabel} plan.</p>
            </div>

            {/* Right: clips count + navigation */}
            <div className="flex shrink-0 flex-wrap items-start gap-3">
              {/* Clips count chip */}
              <div className="rounded-xl border border-border bg-muted px-4 py-3 text-center min-w-[72px]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Clips</p>
                <p className="mt-0.5 text-2xl font-bold text-foreground">{clipCount}</p>
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-2">
                <Link
                  href={`/projects/${id}`}
                  className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-center text-sm font-semibold text-primary transition hover:bg-primary/20 whitespace-nowrap"
                >
                  Project overview
                </Link>
                <Link
                  href={`/projects/${id}/review`}
                  className="relative rounded-lg border border-primary bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 whitespace-nowrap shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                >
                  {clipCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
                      {clipCount}
                    </span>
                  )}
                  Review workspace →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Upload form — full width */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="border-b border-border pb-4 text-xl font-semibold text-foreground">
            Upload a clip
          </h2>
          <div className="mt-6">
            {useUppyUploadExperiment ? (
              <UppyUploadForm projectId={project.id} projectSlug={project.slug} maxFileSizeBytes={maxFileSizeBytes} userPlan={userPlan} />
            ) : (
              <UploadForm projectId={project.id} projectSlug={project.slug} maxFileSizeBytes={maxFileSizeBytes} userPlan={userPlan} />
            )}
          </div>
        </section>

        {/* Clip list */}
        {clips && clips.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Uploaded clips</h2>
              {withMeta > 0 && (
                <span className="text-xs text-muted-foreground">{withMeta} with metadata</span>
              )}
            </div>
            <div className="space-y-2">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {clip.original_filename}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {clip.file_size_bytes
                        ? `${(clip.file_size_bytes / 1024 / 1024).toFixed(1)} MB`
                        : "-"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      clip.metadata_status === "complete"
                        ? "bg-green-500/15 text-green-500"
                        : clip.metadata_status === "processing"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {clip.metadata_status}
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
