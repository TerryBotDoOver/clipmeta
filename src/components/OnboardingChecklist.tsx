"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  hasProject: boolean;
  hasClips: boolean;
  hasMeta: boolean;
  firstProjectSlug: string | null;
}

export function OnboardingChecklist({ hasProject, hasClips, hasMeta, firstProjectSlug }: Props) {
  const [visible, setVisible] = useState(true);
  const [celebrating, setCelebrating] = useState(false);

  const steps = [
    { done: true, label: "Create your account", href: "" },
    { done: hasProject, label: "Create your first project", href: "/projects/new" },
    { done: hasClips, label: "Upload a video clip", href: firstProjectSlug ? `/projects/${firstProjectSlug}/upload` : "/projects/new" },
    { done: hasMeta, label: "Generate AI metadata", href: firstProjectSlug ? `/projects/${firstProjectSlug}/review` : "/projects/new" },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === 4;

  useEffect(() => {
    if (allDone && !celebrating) {
      setCelebrating(true);
      // Mark complete in DB
      fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
      // Hide after 3 seconds
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone]);

  if (!visible) return null;

  if (celebrating) {
    return (
      <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center animate-in fade-in duration-300">
        <div className="text-3xl mb-2">🎉</div>
        <h2 className="text-base font-bold text-foreground">You&apos;re all set!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ve completed the setup. Time to export your first CSV.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">🚀 Get started with ClipMeta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete these steps to generate your first metadata export.
          </p>
        </div>
        <div className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="text-sm font-bold text-primary">{completedCount}/4</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${completedCount * 25}%` }}
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                step.done
                  ? "bg-green-500/20 text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </div>
            {step.done || !step.href ? (
              <span
                className={`text-sm transition-all duration-300 ${
                  step.done ? "text-muted-foreground line-through" : "text-foreground font-medium"
                }`}
              >
                {step.label}
              </span>
            ) : (
              <Link
                href={step.href}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {step.label} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
