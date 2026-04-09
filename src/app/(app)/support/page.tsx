"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const CATEGORIES = [
  { value: "billing", label: "💳 Billing", desc: "Subscription, charges, or refunds" },
  { value: "bug", label: "🐛 Bug", desc: "Something isn't working correctly" },
  { value: "account", label: "👤 Account", desc: "Login, settings, or profile issues" },
  { value: "csv", label: "📄 CSV / Export", desc: "Problems with file exports or platform imports" },
  { value: "metadata", label: "🏷️ Metadata", desc: "AI generation quality or accuracy" },
  { value: "other", label: "💬 Other", desc: "Anything else" },
];

export default function SupportPage() {
  const [category, setCategory] = useState("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? "");
        setUserName(user.user_metadata?.full_name || user.user_metadata?.name || "");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, message, email: userEmail, name: userName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to submit.");
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border border-green-500/20 bg-card p-10 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-foreground">Support ticket submitted</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We&apos;ve received your message and will respond to <strong>{userEmail}</strong> as soon as possible — usually within 24 hours.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="block rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-80"
            >
              Back to dashboard
            </Link>
            <button
              onClick={() => { setDone(false); setSubject(""); setMessage(""); setCategory("bug"); }}
              className="block rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Submit another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Support</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Having trouble? Submit a ticket and we&apos;ll get back to you within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account info (pre-filled, read-only display) */}
          {userEmail && (
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {(userName || userEmail)[0].toUpperCase()}
              </div>
              <div>
                {userName && <p className="text-sm font-medium text-foreground">{userName}</p>}
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">Submitting as this account</span>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Category
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    category === c.value
                      ? "border-foreground bg-muted"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Subject <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              maxLength={120}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Details <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue in detail. What were you doing when it happened? What did you expect vs. what actually occurred?"
              rows={6}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
