"use client";

import { useState } from "react";
import Link from "next/link";

const TYPES = [
  { value: "suggestion", label: "💡 Suggestion", desc: "An idea for a new feature or improvement" },
  { value: "bug", label: "🐛 Bug report", desc: "Something isn't working as expected" },
  { value: "other", label: "💬 Other", desc: "General feedback or questions" },
];

export default function FeedbackPage() {
  const [type, setType] = useState("suggestion");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, description }),
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
          <h1 className="text-2xl font-bold text-foreground">Thanks for the feedback!</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your suggestion has been received. Our team will review it, prepare an implementation plan, and bring it to Levi for approval. We&apos;ll move fast on the good ones.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="block rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-80"
            >
              Back to dashboard
            </Link>
            <button
              onClick={() => { setDone(false); setTitle(""); setDescription(""); setType("suggestion"); }}
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
          <h1 className="text-3xl font-bold text-foreground">Share feedback</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Suggestions go directly to our team. Good ideas get built fast — every submission is reviewed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Type
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-xl border p-4 text-left transition ${
                    type === t.value
                      ? "border-foreground bg-muted"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of your idea or issue"
              maxLength={120}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your suggestion in detail. What problem does it solve? How should it work?"
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
              disabled={submitting || !title.trim() || !description.trim()}
              className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit feedback"}
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
