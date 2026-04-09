"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function BlogNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setLoading(false);
    });
  }, []);

  return (
    <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
          <img src="/logo-icon.svg" className="h-7 w-7" alt="ClipMeta" />
          ClipMeta
        </Link>
        <div className="hidden sm:flex items-center gap-4">
          <Link href="/blog" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition">
            Blog
          </Link>
          <Link href="/pricing" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-20" />
          ) : isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
