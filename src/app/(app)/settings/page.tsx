import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import NameForm from "@/components/NameForm";
import ReferralSection from "@/components/ReferralSection";
import { ManageBillingButton } from "@/components/ManageBillingButton";

const PLANS = {
  free:    { label: "Free",    color: "text-muted-foreground", badge: "bg-muted text-muted-foreground",    clips: 3,    period: "daily",   projects: 1,   rolloverCap: 0,    price: null },
  starter: { label: "Starter", color: "text-sky-400",          badge: "bg-sky-500/15 text-sky-400",         clips: 140,   period: "monthly", projects: 3,   rolloverCap: 280,  price: "$9/mo" },
  pro:     { label: "Pro",     color: "text-indigo-400",        badge: "bg-indigo-500/15 text-indigo-400",   clips: 320,  period: "monthly", projects: 999, rolloverCap: 640,  price: "$19/mo" },
  studio:  { label: "Studio",  color: "text-amber-400",         badge: "bg-amber-500/15 text-amber-400",    clips: 2000, period: "monthly", projects: 999, rolloverCap: 4000, price: "$49/mo" },
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

  // Pull plan and rollover data from profiles
  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("plan, bonus_clips, rollover_clips, referral_pro_forever, referral_pro_until")
    .eq("id", user.id)
    .maybeSingle();

  const rawPlan = (userProfile?.plan && userProfile.plan in PLANS ? userProfile.plan : "free") as keyof typeof PLANS;
  // Check referral upgrades
  let plan = rawPlan;
  if (userProfile?.referral_pro_forever) {
    plan = "pro";
  } else if (userProfile?.referral_pro_until && new Date(userProfile.referral_pro_until) > new Date()) {
    plan = "pro";
  }
  const planInfo = PLANS[plan];
  const bonusClips: number = userProfile?.bonus_clips ?? 0;
  const rolloverClips: number = userProfile?.rollover_clips ?? 0;
  const totalAvailable = planInfo.clips + rolloverClips + bonusClips;

  const ADMIN_ID = "93f38fdf-4506-4dfc-89a2-28767bc0b37d";
  let founderStats: {
    totalUsers: number;
    totalClips: number;
    totalProjects: number;
    totalStorage: number;
    newUsersThisWeek: number;
    newClipsThisWeek: number;
  } | null = null;

  if (user.id === ADMIN_ID) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [
      { count: allClips },
      { count: allProjects },
      { count: newClips },
      { data: storageData },
      { data: usersPage },
      { data: newUsersPage },
    ] = await Promise.all([
      supabaseAdmin.from("clips").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("projects").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("clips").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabaseAdmin.from("clips").select("file_size_bytes"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const totalStorage = (storageData ?? []).reduce(
      (sum: number, c: { file_size_bytes: number | null }) => sum + (c.file_size_bytes ?? 0),
      0
    );
    const newUsers = (newUsersPage?.users ?? []).filter(
      (u) => u.created_at && u.created_at >= weekAgo
    ).length;
    founderStats = {
      totalUsers: (usersPage as { total?: number } | null)?.total ?? 0,
      totalClips: allClips ?? 0,
      totalProjects: allProjects ?? 0,
      totalStorage,
      newUsersThisWeek: newUsers,
      newClipsThisWeek: newClips ?? 0,
    };
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6 sm:px-6 sm:py-10">

        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account and subscription.</p>
        </div>

        {/* Account */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Account</h2>
          <div className="mt-4 space-y-4">
            <NameForm
              initialName={
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                ""
              }
            />
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
            <div>
              <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
              {planInfo.price && (
                <p className="text-sm text-muted-foreground mt-0.5">{planInfo.price} · billed monthly</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${planInfo.badge}`}>
                {planInfo.label}
              </span>
            </div>
          </div>

          {/* Billing actions */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ManageBillingButton />
            <Link
              href="/pricing"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Change Plan →
            </Link>
          </div>

          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
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

          {/* Clip allowance breakdown (paid plans only) */}
          {plan !== "free" && (
            <div className="mt-4 rounded-xl bg-muted px-4 py-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly clip allowance</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground">
                <span>Plan: <span className="font-semibold">{planInfo.clips}</span></span>
                {rolloverClips > 0 && (
                  <span>Rollover: <span className="font-semibold text-sky-400">+{rolloverClips}</span></span>
                )}
                {bonusClips > 0 && (
                  <span>Bonus: <span className="font-semibold text-emerald-400">+{bonusClips}</span></span>
                )}
                <span className="font-bold">= {totalAvailable} available this month</span>
              </div>
              {rolloverClips > 0 && (
                <p className="text-xs text-muted-foreground">
                  Rollover clips carry over from last month (max {planInfo.rolloverCap} banked).
                </p>
              )}
              {rolloverClips === 0 && (
                <p className="text-xs text-muted-foreground">
                  Unused clips roll over each month (up to {planInfo.rolloverCap} banked).
                </p>
              )}
            </div>
          )}

          {plan === "free" && (
            <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-4">
              <p className="text-sm font-semibold text-indigo-400">Upgrade to Pro — $19/month</p>
              <p className="mt-1 text-xs text-muted-foreground">
                320 clips/month, bulk generation, priority support. Unlimited projects.
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

        {/* Founder Stats */}
        {founderStats && (
          <section className="rounded-2xl border border-amber-500/30 bg-card p-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Founder Stats</h2>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">admin</span>
            </div>
            <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div className="rounded-xl bg-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total users</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{founderStats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">+{founderStats.newUsersThisWeek} this week</p>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total clips</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{founderStats.totalClips}</p>
                <p className="text-xs text-muted-foreground">+{founderStats.newClipsThisWeek} this week</p>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total projects</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{founderStats.totalProjects}</p>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3 sm:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total storage</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {founderStats.totalStorage >= 1_073_741_824
                    ? `${(founderStats.totalStorage / 1_073_741_824).toFixed(2)} GB`
                    : founderStats.totalStorage >= 1_048_576
                    ? `${(founderStats.totalStorage / 1_048_576).toFixed(1)} MB`
                    : `${(founderStats.totalStorage / 1024).toFixed(1)} KB`}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Referral Program */}
        <ReferralSection userId={user.id} />

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
