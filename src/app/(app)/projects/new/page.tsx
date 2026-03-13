import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

function slugifyProjectName(value: string) {
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

    if (!name) {
      throw new Error("Project name is required.");
    }

    const slug = slugifyProjectName(name);

    if (!slug) {
      throw new Error("Project slug could not be created.");
    }

    const { error } = await supabase.from("projects").insert({
      name,
      slug,
      description: description || null,
      status: "draft",
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/projects");
    redirect(`/projects/${slug}`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            New Project
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Create a new ClipMeta project
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This is now connected to Supabase. Creating a project here will insert
            a real project record and then open its project detail page.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={createProject} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-900"
              >
                Project name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Example: Hawaii Drone Batch"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-slate-900"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Optional short description for this project."
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />
            </div>

            <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              The project slug will be generated automatically from the project name.
            </div>

            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Create project
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}