import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";

const PLANS = {
  free: { label: "Free", color: "text-muted-foreground", badge: "bg-muted text-muted-foreground", clips: 10, projects: 1 },
  pro: { label: "Pro", color: "text-indigo-400", badge: "bg-indigo-500/15 text-indigo-400", clips: 200, projects: 999 },
  studio: { label: "Studio", color: "text-amber-400", badge: "bg-amber-500/15 text-amber-400", clips: 999999, projects: 999 },
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Get usage stats
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("user_id", user.id);

  const projectIds = projects?.map((p) => p.id) ?? [];
  let totalClips = 0;
  let clipsWithMeta = 0;

  if (projectIds.length > 0) {
    const { data: clips } = await supabaseAdmin
      .from("clips")
      .select("id, metadata_status")
      .in("project_id", projectIds);
    totalClips = clips?.length ?? 0;
    clipsWithMeta = clips?.filter((c) => c.metadata_status === "complete").length ?? 0;
  }

  const plan = "free"; // TODO: pull from subscription table when Stripe is wired up
  const planInfo = PLANS[plan];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account and subscription.</p>
        </div>

        {/* Account */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Account</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="mt-1 text-sm text-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User ID</p>
                <p className="mt-1 text-xs text-muted-foreground font-mono">{user.id}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member since</p>
                <p className="mt-1 text-sm text-foreground">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${planInfo.badge}`}>
              {planInfo.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projects</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{projects?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">
                of {plan === "free" ? "1" : "unlimited"}
              </p>
            </div>
            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total clips</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{totalClips}</p>
            </div>
            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">With metadata</p>
              <p className="mt-1 text-2xl font-bold text-green-500">{clipsWithMeta}</p>
            </div>
          </div>

          {plan === "free" && (
            <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-4">
              <p className="text-sm font-semibold text-indigo-400">Upgrade to Pro — $19/month</p>
              <p className="mt-1 text-xs text-muted-foreground">
                200 clips/month, bulk generation, priority support. Unlimited projects.
              </p>
              <Link
                href="/pricing"
                className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                View plans →
              </Link>
            </div>
          )}
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-red-500/20 bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Danger zone</h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Delete account</p>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
            </div>
            <button
              disabled
              className="rounded-lg border border-red-500/40 px-4 py-2 text-xs font-medium text-red-400 opacity-50 cursor-not-allowed"
              title="Contact support to delete your account"
            >
              Delete account
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}
