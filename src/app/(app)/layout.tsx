"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const dashboardIsActive = pathname === "/dashboard";
  const projectsIsActive =
    pathname === "/projects" || pathname.startsWith("/projects/");

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/dashboard" className="text-lg font-bold text-slate-900">
              ClipMeta
            </Link>
            <p className="text-xs text-slate-500">
              Stock footage metadata workspace
            </p>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                dashboardIsActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Dashboard
            </Link>

            <Link
              href="/projects"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                projectsIsActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Projects
            </Link>

            <button
              onClick={handleSignOut}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
