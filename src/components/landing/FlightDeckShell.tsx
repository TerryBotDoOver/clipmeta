"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MouseGlow } from "./MouseGlow";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Reusable marketing-page shell. Provides the Flight Deck aesthetic
 * around any page content: fixed atmosphere, floating nav pill,
 * cursor glow, film grain, and footer.
 *
 * Usage:
 *   <FlightDeckShell>
 *     <YourPageContent />
 *   </FlightDeckShell>
 */
export function FlightDeckShell({
  children,
  hideNavChip = false,
}: {
  children: React.ReactNode;
  hideNavChip?: boolean;
}) {
  const [authState, setAuthState] = useState<"loading" | "signed-in" | "signed-out">("loading");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setAuthState(session ? "signed-in" : "signed-out");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? "signed-in" : "signed-out");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050507] text-white">
      {/* Page-global atmosphere — fixed so it's always behind the nav, no matter where you scroll */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-50">
          <div className="aurora-bg"><span /></div>
        </div>
        {/* Subtle grid overlay, global */}
        <div className="grid-overlay" />
        {/* Soft radial vignette near the top so the nav always has a soft frame */}
        <div
          className="absolute inset-x-0 top-0 h-[60vh]"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139, 92, 246, 0.12) 0%, rgba(6, 182, 212, 0.06) 35%, transparent 70%)",
          }}
        />
      </div>

      {/* Cursor-following ambient glow (above atmosphere, below grain) */}
      <MouseGlow />

      {/* Film grain overlay (fixed, top layer) */}
      <div className="film-grain" />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FLOATING PILL NAV                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="pointer-events-none sticky top-4 z-50 flex justify-center px-4 sm:top-6">
        <nav
          className="pointer-events-auto flex w-full max-w-[1100px] items-center justify-between gap-4 rounded-full border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-xl sm:px-4"
          style={{
            boxShadow:
              "0 10px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
          }}
        >
          <Link
            href="/"
            className="group flex items-center gap-2 pl-2 text-sm font-bold text-white sm:text-base"
          >
            <div className="relative flex h-7 w-7 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 opacity-40 blur-md transition-all group-hover:opacity-70" />
              <img src="/logo-icon.svg" className="relative h-6 w-6" alt="ClipMeta" />
            </div>
            <span className="tracking-tight">ClipMeta</span>
            {!hideNavChip && (
              <span className="hud-chip ml-1 hidden lg:inline-flex">v2.0 · LIVE</span>
            )}
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            <Link
              href="/tools/metadata-grader"
              className="group relative rounded-full px-4 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <span className="inline-flex items-center gap-1.5">
                Free Grader
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-300">
                  New
                </span>
              </span>
            </Link>
            <Link
              href="/pricing"
              className="rounded-full px-4 py-1.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="rounded-full px-4 py-1.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              Blog
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            {authState === "loading" ? (
              <div className="h-8 w-28 rounded-full border border-white/10 bg-white/[0.03]" aria-hidden />
            ) : authState === "signed-in" ? (
              <Link
                href="/dashboard"
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/40"
              >
                <span className="relative z-10">Dashboard</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth?mode=signin"
                  className="hidden rounded-full px-4 py-1.5 text-sm font-medium text-white/70 transition hover:text-white sm:inline-block"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="group relative overflow-hidden rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/40"
                >
                  <span className="relative z-10">Get Started</span>
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* Page content */}
      <div className="relative z-10 -mt-[72px] pt-[72px] sm:-mt-[80px] sm:pt-[80px]">
        {children}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 text-white/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-3 text-sm">
            <img src="/logo-icon.svg" className="h-5 w-5" alt="" />
            <span>© 2026 ClipMeta</span>
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-sm">
            <Link href="/tools/metadata-grader" className="transition hover:text-white">Free Grader</Link>
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
            <Link href="/blog" className="transition hover:text-white">Blog</Link>
            <Link href="/legal/terms" className="transition hover:text-white">Terms</Link>
            <Link href="/legal/privacy" className="transition hover:text-white">Privacy</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
