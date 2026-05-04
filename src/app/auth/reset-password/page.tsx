"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();

    function finishReady() {
      if (!active) return;
      setSessionReady(true);
      setVerifying(false);
      setError("");
    }

    function finishError(message: string) {
      if (!active) return;
      setSessionReady(false);
      setVerifying(false);
      setError(message);
    }

    async function verifyResetLink() {
      setVerifying(true);

      const urlError = searchParams.get("error_description") || searchParams.get("error");
      if (urlError) {
        finishError(decodeURIComponent(urlError.replace(/\+/g, " ")));
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          finishError(exchangeError.message || "This reset link is invalid or has expired. Please request a new one.");
          return;
        }
        window.history.replaceState(null, "", "/auth/reset-password");
        finishReady();
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");
      const hashError = hashParams.get("error_description") || hashParams.get("error");

      if (hashError) {
        finishError(decodeURIComponent(hashError.replace(/\+/g, " ")));
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          finishError(sessionError.message || "This reset link is invalid or has expired. Please request a new one.");
          return;
        }
        window.history.replaceState(null, "", "/auth/reset-password");
        finishReady();
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finishReady();
        return;
      }

      finishError(
        type === "recovery"
          ? "We could not verify this reset link. Please request a new password reset email."
          : "Open this page from the password reset link in your email."
      );
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        finishReady();
      }
    });

    verifyResetLink();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-foreground">Password updated!</h2>
        <p className="mt-3 text-sm text-muted-foreground">Redirecting you to the dashboard…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Set a new password</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Choose a strong password for your account.</p>
      </div>
      {error && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {verifying && (
        <div className="mb-5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
          Verifying your reset link…
        </div>
      )}
      {!verifying && !sessionReady && (
        <div className="mb-5 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <a href="/auth" className="font-semibold text-foreground underline">Request a new reset link</a>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Same password again"
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading || verifying || !sessionReady}
          className="w-full rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <img src="/logo-icon.svg" className="h-8 w-8" alt="ClipMeta" />
            <span className="font-bold text-foreground">ClipMeta</span>
          </div>
          <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
