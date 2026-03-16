import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { UploadForm } from "@/components/UploadForm";

type UploadPageProps = {
  params: Promise<{ id: string }>;
};

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

  const { data: clips } = await supabase
    .from("clips")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const clipCount = clips?.length ?? 0;
  const withMeta = clips?.filter((c) => c.metadata_status === "complete").length ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Upload</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Files go directly to storage — no server size limits.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

          {/* Upload form */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="border-b border-border pb-4 text-xl font-semibold text-foreground">
              Upload a clip
            </h2>
            <div className="mt-6">
              <UploadForm projectId={project.id} projectSlug={project.slug} />
            </div>
          </section>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">

            {/* CTA: go to review */}
            {clipCount > 0 && (
              <Link
                href={`/projects/${id}/review`}
                className="block rounded-2xl border-2 border-primary bg-primary/10 p-6 transition hover:bg-primary/15"
              >
                <p className="text-lg font-bold text-foreground">Ready to review?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {clipCount} clip{clipCount !== 1 ? "s" : ""} uploaded
                  {withMeta > 0 ? `, ${withMeta} with metadata` : ""}.
                </p>
                <p className="mt-4 text-sm font-semibold text-primary">Go to Review →</p>
              </Link>
            )}

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clips</h2>
              <p className="mt-2 text-4xl font-bold text-foreground">{clipCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">uploaded to this project</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground">Navigation</h2>
              <div className="mt-3 space-y-2">
                <Link
                  href={`/projects/${id}`}
                  className="block rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Project overview
                </Link>
                <Link
                  href={`/projects/${id}/review`}
                  className="block rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Review workspace
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Clip list */}
        {clips && clips.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Uploaded clips</h2>
            <div className="space-y-2">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {clip.original_filename}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {clip.file_size_bytes
                        ? `${(clip.file_size_bytes / 1024 / 1024).toFixed(1)} MB`
                        : "-"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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
