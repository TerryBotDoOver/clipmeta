"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-2">

          {/* Left panel */}
          <section className="flex flex-col justify-between bg-slate-900 p-8 text-white md:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                ClipMeta
              </p>
              <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
                Stock footage metadata that needs less fixing
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-300 md:text-base">
                Upload clips, generate metadata, review results, and export clean CSV files
                for stock footage platforms.
              </p>
            </div>
            <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Built for contributors</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Stop wasting time on repetitive metadata. ClipMeta handles the heavy
                lifting so you can focus on shooting.
              </p>
            </div>
          </section>

          {/* Right panel */}
          <section className="p-8 md:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Sign in to ClipMeta
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link href="/sign-up" className="font-medium text-slate-900 underline">
                    Sign up free
                  </Link>
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
