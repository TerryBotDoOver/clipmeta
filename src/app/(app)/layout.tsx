"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const dashboardIsActive = pathname === "/dashboard";
  const projectsIsActive = pathname === "/projects" || pathname.startsWith("/projects/");
  const settingsIsActive = pathname === "/settings";
  const feedbackIsActive = pathname === "/feedback";

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/dashboard" className="text-lg font-bold text-foreground">
              ClipMeta
            </Link>
            <p className="text-xs text-muted-foreground">
              Stock footage metadata workspace
            </p>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                dashboardIsActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>

            <Link
              href="/projects"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                projectsIsActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Projects
            </Link>

            <Link
              href="/feedback"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                feedbackIsActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Feedback
            </Link>

            <Link
              href="/settings"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                settingsIsActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Settings
            </Link>

            <ThemeToggle />

            <button
              onClick={handleSignOut}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <div>{children}</div>
    </div>
  );
}
