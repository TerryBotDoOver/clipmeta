import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewProjectPage() {
  async function createProject(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();

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
