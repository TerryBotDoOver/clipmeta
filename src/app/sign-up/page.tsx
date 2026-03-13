"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-2">

          <section className="flex flex-col justify-between bg-slate-900 p-8 text-white md:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                ClipMeta
              </p>
              <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
                Stop fixing metadata manually
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-300 md:text-base">
                ClipMeta generates stock-ready titles, descriptions, and keywords from
                your clips — so you can spend less time on prep and more time shooting.
              </p>
            </div>
            <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Free to start</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Create your account and start uploading clips immediately.
              </p>
            </div>
          </section>

          <section className="p-8 md:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Create your account
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/auth" className="font-medium text-slate-900 underline">
                    Sign in
                  </Link>
                </p>
              </div>

              {success ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                  <p className="text-sm font-semibold text-green-800">Check your email</p>
                  <p className="mt-2 text-sm text-green-700">
                    We sent a confirmation link to <strong>{email}</strong>. Click it to
                    activate your account, then sign in.
                  </p>
                  <Link
                    href="/auth"
                    className="mt-4 block text-sm font-medium text-green-800 underline"
                  >
                    Back to sign in
                  </Link>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleSignUp} className="space-y-5">
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
                        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-slate-500"
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
                        placeholder="At least 8 characters"
                        minLength={8}
                        required
                        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {loading ? "Creating account…" : "Create Account"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
