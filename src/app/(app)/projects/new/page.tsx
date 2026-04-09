import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Platform, GenerationSettings } from "@/lib/platform-presets";
import { ProjectSettingsForm } from "@/components/ProjectSettingsForm";
import { BLACKBOX_COUNTRIES } from "@/lib/blackbox-countries";

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  // Append short random suffix to prevent slug collisions
  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : "";
}

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const errorMessage = params.error;
  async function createProject(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const pinnedKeywords = String(formData.get("pinnedKeywords") || "").trim();
    const pinnedKeywordsPosition = String(formData.get("pinnedKeywordsPosition") || "beginning").trim();
    const location = String(formData.get("location") || "").trim();
    const shootingDate = String(formData.get("shootingDate") || "").trim();
    const platform = (String(formData.get("platform") || "generic")) as Platform;

    // Parse advanced settings from form
    const keywordCount = Math.min(50, Math.max(15, parseInt(String(formData.get("keywordCount") || "35"), 10)));
    const titleStyle = formData.get("titleStyle") === "descriptive" ? "descriptive" : "seo";
    const descStyle = formData.get("descStyle") === "concise" ? "concise" : "detailed";
    const includeLocation = formData.get("includeLocation") === "on";
    const includeCameraDetails = formData.get("includeCameraDetails") === "on";

    const titleMaxChars = Math.min(200, Math.max(50, parseInt(String(formData.get("titleMaxChars") || "200"), 10)));
    const descMaxChars = Math.min(500, Math.max(100, parseInt(String(formData.get("descMaxChars") || "300"), 10)));
    const rawFormat = String(formData.get("keywordFormat") || "mixed");
    const keywordFormat = (["mixed", "single", "phrases"].includes(rawFormat) ? rawFormat : "mixed") as "mixed" | "single" | "phrases";

    const generation_settings: GenerationSettings = {
      keywordCount,
      titleStyle,
      descStyle,
      includeLocation,
      includeCameraDetails,
      titleMaxChars,
      descMaxChars,
      keywordFormat,
      hasDescription: platform !== "adobe_stock",
    };

    if (!name) throw new Error("Project name is required.");

    const slug = slugify(name);
    if (!slug) throw new Error("Could not generate slug from name.");

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth");

    // Enforce project limit per plan — check subscription status to handle trialing/founder correctly
    const { data: profile } = await supabase.from("profiles").select("plan, stripe_subscription_status").eq("id", user.id).single();
    const activeStatuses = ["active", "trialing", "founder"];
    const isActiveSub = activeStatuses.includes(profile?.stripe_subscription_status ?? "");
    const userPlan = (isActiveSub ? profile?.plan : "free") ?? "free";
    const PROJECT_LIMITS: Record<string, number> = { free: 1, trial: 3, starter: 3, pro: 999, studio: 999 };
    const limit = PROJECT_LIMITS[userPlan] ?? 1;
    const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null);
    if ((count ?? 0) >= limit) {
      redirect(`/projects/new?error=${encodeURIComponent(`Your ${userPlan} plan allows ${limit} project${limit === 1 ? "" : "s"}. Upgrade to create more.`)}`);
    }

    const { error } = await supabase.from("projects").insert({
      name,
      slug,
      description: description || null,
      pinned_keywords: pinnedKeywords || null,
      pinned_keywords_position: pinnedKeywordsPosition,
      location: location || null,
      shooting_date: shootingDate || null,
      status: "active",
      user_id: user.id,
      platform,
      generation_settings,
    });

    if (error) {
      // If it's a duplicate, retry with a new slug
      if (error.message.includes("duplicate") || error.code === "23505") {
        const retrySlug = slugify(name);
        const { error: retryErr } = await supabase.from("projects").insert({
          name,
          slug: retrySlug,
          description: description || null,
          pinned_keywords: pinnedKeywords || null,
          pinned_keywords_position: pinnedKeywordsPosition,
          location: location || null,
          shooting_date: shootingDate || null,
          status: "active",
          user_id: user.id,
          platform,
          generation_settings,
        });
        if (retryErr) redirect(`/projects/new?error=${encodeURIComponent(retryErr.message)}`);
        revalidatePath("/projects");
        redirect(`/projects/${retrySlug}`);
      }
      redirect(`/projects/new?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/projects");
    redirect(`/projects/${slug}`);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="border-b border-border pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            New Project
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Create a project
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A project holds a batch of clips and all the metadata you generate for them.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form action={createProject} className="space-y-6">
            {/* Project name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                Project name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Hawaii Drone Batch"
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Short description for this batch."
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </div>

            {/* Mandatory keywords */}
            <div>
              <label htmlFor="pinnedKeywords" className="block text-sm font-medium text-foreground">
                Mandatory Keywords <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="pinnedKeywords"
                name="pinnedKeywords"
                type="text"
                placeholder="e.g. Vikos Gorge, Greece, Zagori, Epirus, mountain pass"
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                These keywords will be added to every clip&apos;s keywords. Comma-separated.
              </p>
              <div className="flex gap-1 mt-1.5">
                {['beginning', 'middle', 'end'].map((pos) => (
                  <label
                    key={pos}
                    className="cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="pinnedKeywordsPosition"
                      value={pos}
                      defaultChecked={pos === 'beginning'}
                      className="sr-only peer"
                    />
                    <span className="px-3 py-1 text-xs rounded-md border transition block peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary bg-background text-muted-foreground border-input hover:border-primary/50">
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Shooting Country */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-foreground">
                Shooting Country <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <select
                id="location"
                name="location"
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="">Select a country...</option>
                {BLACKBOX_COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Populates the Shooting Country column in your Blackbox CSV export.
              </p>
            </div>

            {/* Shooting Date */}
            <div>
              <label htmlFor="shootingDate" className="block text-sm font-medium text-foreground">
                Shooting Date <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="shootingDate"
                name="shootingDate"
                type="date"
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Populates the Shooting Date column in your Blackbox CSV export.
              </p>
            </div>

            {/* Platform selector + advanced settings (client component) */}
            <ProjectSettingsForm />

            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Create Project →
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
