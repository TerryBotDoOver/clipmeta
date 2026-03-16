import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  Platform,
  PLATFORM_LABELS,
  PLATFORM_DESCRIPTIONS,
  PLATFORM_PRESETS,
  GenerationSettings,
} from "@/lib/platform-presets";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const PLATFORMS: Platform[] = ["blackbox", "pond5", "adobe_stock", "shutterstock", "generic"];

export default function NewProjectPage() {
  async function createProject(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const platform = (String(formData.get("platform") || "generic")) as Platform;

    // Parse advanced settings from form
    const keywordCount = Math.min(50, Math.max(15, parseInt(String(formData.get("keywordCount") || "35"), 10)));
    const titleStyle = formData.get("titleStyle") === "descriptive" ? "descriptive" : "seo";
    const includeLocation = formData.get("includeLocation") === "on";
    const includeCameraDetails = formData.get("includeCameraDetails") === "on";

    const generation_settings: GenerationSettings = {
      keywordCount,
      titleStyle,
      includeLocation,
      includeCameraDetails,
    };

    if (!name) throw new Error("Project name is required.");

    const slug = slugify(name);
    if (!slug) throw new Error("Could not generate slug from name.");

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth");

    const { error } = await supabase.from("projects").insert({
      name,
      slug,
      description: description || null,
      status: "active",
      user_id: user.id,
      platform,
      generation_settings,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/projects");
    redirect(`/projects/${slug}`);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="border-b border-slate-200 pb-6">
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

        <section className="mt-8 rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
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
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Short description for this batch."
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />
            </div>

            {/* Platform selector */}
            <div>
              <p className="block text-sm font-medium text-foreground">Target platform</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ClipMeta will tailor keyword count, title style, and format automatically.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-1">
                {PLATFORMS.map((p) => {
                  const preset = PLATFORM_PRESETS[p];
                  return (
                    <label
                      key={p}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-input bg-background px-4 py-3 transition hover:border-slate-400 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="platform"
                        value={p}
                        defaultChecked={p === "generic"}
                        className="mt-0.5 accent-slate-900"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {PLATFORM_LABELS[p]}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            {preset.keywordCount} keywords
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {PLATFORM_DESCRIPTIONS[p]}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Advanced settings */}
            <details className="rounded-xl border border-input bg-background">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition">
                ▸ Advanced settings
              </summary>
              <div className="space-y-5 border-t border-input px-4 py-4">
                {/* Keyword count */}
                <div>
                  <label htmlFor="keywordCount" className="block text-sm font-medium text-foreground">
                    Keyword count
                  </label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Override the platform default (15–50). Leave as preset value to match platform recommendation.
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="keywordCount"
                      name="keywordCount"
                      type="range"
                      min={15}
                      max={50}
                      defaultValue={35}
                      className="flex-1 accent-slate-900"
                    />
                    <span className="w-8 text-right text-sm font-semibold text-foreground tabular-nums" id="keywordCountDisplay">
                      35
                    </span>
                  </div>
                  {/* Live update via inline script */}
                  <script
                    dangerouslySetInnerHTML={{
                      __html: `
                        (function() {
                          var slider = document.getElementById('keywordCount');
                          var display = document.getElementById('keywordCountDisplay');
                          if (slider && display) {
                            slider.addEventListener('input', function() { display.textContent = this.value; });
                          }
                        })();
                      `,
                    }}
                  />
                </div>

                {/* Title style */}
                <div>
                  <p className="block text-sm font-medium text-foreground">Title style</p>
                  <div className="mt-2 flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="titleStyle"
                        value="seo"
                        defaultChecked
                        className="accent-slate-900"
                      />
                      <span className="text-sm text-foreground">SEO-focused</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="titleStyle"
                        value="descriptive"
                        className="accent-slate-900"
                      />
                      <span className="text-sm text-foreground">Descriptive</span>
                    </label>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name="includeLocation"
                      defaultChecked
                      className="h-4 w-4 rounded accent-slate-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">Include location / region</span>
                      <p className="text-xs text-muted-foreground">Add geography keywords when identifiable from frames.</p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name="includeCameraDetails"
                      defaultChecked
                      className="h-4 w-4 rounded accent-slate-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">Include camera &amp; equipment details</span>
                      <p className="text-xs text-muted-foreground">Add camera perspective keywords (aerial, drone, close-up, wide shot).</p>
                    </div>
                  </label>
                </div>
              </div>
            </details>

            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Create Project →
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
