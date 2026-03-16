"use client";

import { useState } from "react";

interface EmailCaptureProps {
  source: string;
  headline?: string;
  subtext?: string;
}

export default function EmailCapture({
  source,
  headline = "Get early access",
  subtext = "Be the first to know when new features ship.",
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="border-t border-border bg-muted/50 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">{headline}</h2>
        <p className="mt-3 text-muted-foreground">{subtext}</p>

        {status === "success" ? (
          <p className="mt-8 text-base font-semibold text-foreground">You are on the list!</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary sm:w-72"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "loading" ? "Submitting…" : "Notify Me"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-sm text-destructive">Something went wrong, try again.</p>
        )}
      </div>
    </section>
  );
}
