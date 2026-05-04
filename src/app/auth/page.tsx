"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fbEvent } from "@/components/MetaPixel";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";

type RedditTrackingWindow = Window & {
  rdt?: (event: "track", name: string) => void;
};

function friendlyAuthError(message: string) {
  if (/email rate limit exceeded/i.test(message)) {
    return "Too many reset emails were requested for this address. Please wait a few minutes, then try again.";
  }
  return message;
}

function AuthForm() {
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref");
  const fromPricing = refParam === "pricing";
  const startsInSignup =
    fromPricing ||
    searchParams.get("mode") === "signup" ||
    (refParam !== null && /^[0-9a-f]{8}$/i.test(refParam));
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(startsInSignup ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hasRecoveryHash = hashParams.get("type") === "recovery";
    const hasRecoveryParams = searchParams.get("type") === "recovery" || searchParams.has("code");
    if (hasRecoveryHash || hasRecoveryParams) {
      window.location.replace(`/auth/reset-password${window.location.search}${window.location.hash}`);
      return;
    }

    // Capture referral code from ?ref= param (8 hex chars from referrer's user UUID)
    // Save to localStorage so it survives email confirmation / OAuth redirect
    if (refParam && /^[0-9a-f]{8}$/i.test(refParam)) {
      try {
        localStorage.setItem("pendingReferral", refParam.toLowerCase());
      } catch {}
    }
  }, [searchParams, refParam]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    window.location.href = "/dashboard";
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    // If user came from pricing, send them back there after confirming email
    const next = fromPricing ? "/pricing" : "/dashboard";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    // Supabase returns an empty identities array when the email already exists
    // (instead of an error, to prevent email enumeration)
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Sign in instead, or reset your password.");
      setLoading(false);
      return;
    }
    fbEvent('CompleteRegistration', { content_name: 'ClipMeta Signup' });
    if (typeof window !== 'undefined') {
      const rdt = (window as RedditTrackingWindow).rdt;
      if (typeof rdt === "function") rdt("track", "SignUp");
    }
    setSignupDone(true);
    setLoading(false);
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) { setError(friendlyAuthError(error.message)); setLoading(false); return; }
    setResetDone(true);
    setLoading(false);
  }

  async function handleGoogleAuth() {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const next = fromPricing ? "/pricing" : "/dashboard";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  if (resetDone) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
          We sent a password reset link to <strong>{email}</strong>. Click it to set a new password.
        </p>
        <button
          onClick={() => { setResetDone(false); setMode("signin"); }}
          className="mt-6 text-sm text-primary underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Reset your password</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        {error && (
          <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
        <button
          onClick={() => { setMode("signin"); setError(""); }}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  if (signupDone) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✉️</div>
        <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and get started.
        </p>
        <button
          onClick={() => { setSignupDone(false); setMode("signin"); setPassword(""); }}
          className="mt-6 text-sm text-primary underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      {/* Tab switcher */}
      <div className="flex rounded-xl border border-border bg-muted p-1 mb-8">
        <button
          onClick={() => { setMode("signin"); setError(""); }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
            mode === "signin"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode("signup"); setError(""); }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Create Account
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {mode === "signin" ? "Welcome back" : "Start your free trial"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to your ClipMeta account."
            : "Free plan available. Paid plans include a 7-day trial."}
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <p>{error}</p>
          {error.includes("already exists") && (
            <div className="mt-2 flex gap-3 text-xs">
              <button
                onClick={() => { setMode("signin"); setError(""); }}
                className="font-semibold text-foreground underline hover:text-primary transition"
              >
                Sign in
              </button>
              <button
                onClick={() => { setMode("reset"); setError(""); }}
                className="font-semibold text-foreground underline hover:text-primary transition"
              >
                Reset password
              </button>
            </div>
          )}
        </div>
      )}

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">or continue with email</span>
        </div>
      </div>

      <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Full name <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">
              Password
            </label>
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => { setMode("reset"); setError(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? (mode === "signin" ? "Signing in…" : "Creating account…")
            : (mode === "signin" ? "Sign In" : "Create Account — It's Free")}
        </button>
      </form>

      {mode === "signin" && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button onClick={() => { setMode("signup"); setError(""); }} className="text-foreground font-semibold underline">
            Sign up free
          </button>
        </p>
      )}

      {mode === "signup" && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <a href="/legal/terms" className="underline">Terms</a> and{" "}
          <a href="/legal/privacy" className="underline">Privacy Policy</a>.
        </p>
      )}
    </div>
  );
}

export default function AuthPage() {
  return (
    <FlightDeckShell>
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
        <div className="glass-card grid w-full overflow-hidden p-0 md:grid-cols-2">

          {/* Left panel — promo */}
          <section className="relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 md:p-10">
            {/* Aurora glow inside the left panel */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 opacity-50 blur-md" />
                  <img src="/logo-icon.svg" className="relative h-9 w-9" alt="ClipMeta" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">ClipMeta · Flight Deck</p>
              </div>
              <h1 className="mt-8 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Stock footage metadata, <span className="gradient-text">done in minutes.</span>
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/60 md:text-base">
                Upload clips, let AI read the frames and write everything, export platform-ready CSVs. You stay in control of quality.
              </p>
            </div>
            <div className="relative mt-10 space-y-3">
              {[
                "AI reads your footage — not just the filename",
                "CSV exports for every major platform",
                "Free plan, no credit card required",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-bold text-violet-300">✓</span>
                  <span className="text-sm text-white/75">{point}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Right panel — form */}
          <section className="flex items-center border-t border-white/5 bg-black/20 p-6 backdrop-blur-sm sm:p-8 md:border-l md:border-t-0 md:p-10">
            <div className="w-full">
              <Suspense fallback={<div className="text-sm text-white/50">Loading…</div>}>
                <AuthForm />
              </Suspense>
            </div>
          </section>
        </div>
      </div>
    </FlightDeckShell>
  );
}
