"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlanBadge } from "@/components/PlanBadge";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { PromoReward } from "@/components/PromoReward";
import { UTMSync } from "@/components/UTMSync";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦", exact: true },
  { href: "/projects", label: "Projects", icon: "⊞", exact: false },
  { href: "/feedback", label: "Feedback", icon: "✦", exact: true },
  { href: "/support", label: "Support", icon: "🎧", exact: true },
  { href: "/blog", label: "Blog", icon: "✎", exact: false },
  { href: "/settings", label: "Settings", icon: "⚙", exact: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <UTMSync />
      {/* ── Mobile backdrop ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
          <img src="/logo-icon.svg" className="h-7 w-7" alt="ClipMeta" />
          <div>
            <p className="text-sm font-bold leading-none text-foreground">ClipMeta</p>
            <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">metadata workspace</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5 pt-3">
          {NAV.map(({ href, label, icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 space-y-0.5 border-t border-sidebar-border p-2.5">
          <div className="px-3 py-2">
            <PlanBadge />
          </div>
          <div className="flex items-center justify-between rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <span className="text-base leading-none">↪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden md:ml-56">
        {/* Promo reward (top banner + popup, gated by onboarding completion) */}
        <PromoReward />
        {/* Upgrade Banner (legacy, now disabled) */}
        <UpgradeBanner />
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-4 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Open navigation menu"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="ml-3 flex items-center gap-2">
            <img src="/logo-icon.svg" className="h-6 w-6" alt="ClipMeta" />
            <span className="text-sm font-bold text-foreground">ClipMeta</span>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
