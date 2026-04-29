"use client";

import { useState } from "react";
import { normalizeEntitlementPlan } from "@/lib/plans";

type ClipResult = {
  id: string;
  filename: string;
  status: "ok" | "error";
  error?: string;
};

type Props = {
  projectId: string;
  clipCount: number; // number of clips with complete metadata
  userPlan?: string; // for plan gating
};

type Stage = "idle" | "credentials" | "transferring" | "done" | "error";
// One clip per Vercel function invocation. Pro-plan clips routinely run 150-250MB,
// and Blackbox FTP upload is modest -- bundling multiple clips into a single 300s
// function call reliably times out. One-per-call stays well under the ceiling and
// gives per-clip success/failure granularity. The small inter-batch delay avoids
// hammering Blackbox's auth endpoint with back-to-back logins.
const BATCH_SIZE = 1;
const INTER_BATCH_DELAY_MS = 400;

const FTP_PLANS = ['pro', 'studio', 'founder'];
const PRORES_PLANS = ['pro', 'studio', 'founder'];

export function BlackboxFtpButton({ projectId, clipCount, userPlan = 'free' }: Props) {
  const basePlan = normalizeEntitlementPlan(userPlan);
  const canFtp = FTP_PLANS.includes(basePlan);
  const canProRes = PRORES_PLANS.includes(basePlan);
  const [stage, setStage] = useState<Stage>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [results, setResults] = useState<ClipResult[]>([]);
  const [summary, setSummary] = useState({ total: 0, succeeded: 0, failed: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  if (clipCount === 0) return null;

  async function startTransfer() {
    if (!email.trim() || !password.trim()) return;
    setStage("transferring");
    setErrorMsg("");

    try {
      // First, get the list of clip IDs with complete metadata
      const clipsRes = await fetch(`/api/projects/${projectId}/clip-ids?status=complete`);
      let allClipIds: string[] | null = null;
      if (clipsRes.ok) {
        const d = await clipsRes.json();
        allClipIds = d.clip_ids ?? null;
      }
      // If we can't get IDs, fall back to sending no clip_ids (API will fetch all complete clips)

      const batches = allClipIds
        ? Array.from({ length: Math.ceil(allClipIds.length / BATCH_SIZE) }, (_, i) =>
            allClipIds!.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE))
        : [null]; // null = send all, server decides

      const totalBatches = batches.length;
      setBatchProgress({ current: 0, total: totalBatches });

      const allResults: ClipResult[] = [];
      let totalSucceeded = 0;
      let totalFailed = 0;
      let totalClips = 0;

      let batchErrors = 0;

      for (let i = 0; i < batches.length; i++) {
        setBatchProgress({ current: i + 1, total: totalBatches });

        // Small breather between batches so Blackbox's FTP auth doesn't
        // see 24 back-to-back logins from the same IP.
        if (i > 0) await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));

        try {
          const res = await fetch("/api/ftp/blackbox", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: projectId,
              blackbox_email: email.trim(),
              blackbox_password: password,
              ...(batches[i] ? { clip_ids: batches[i] } : {}),
            }),
          });

          // Handle non-JSON responses (Vercel timeout returns HTML error pages)
          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            const batchClipCount = batches[i]?.length ?? clipCount;
            for (let j = 0; j < batchClipCount; j++) {
              allResults.push({ id: `batch-${i}-${j}`, filename: `Batch ${i + 1} clip ${j + 1}`, status: "error" as const, error: "Server timeout" });
            }
            totalFailed += batchClipCount;
            totalClips += batchClipCount;
            batchErrors++;
            continue; // Try next batch instead of aborting
          }

          const data = await res.json();

          if (!res.ok) {
            // Auth errors should stop immediately
            if (res.status === 401) {
              setErrorMsg(data.error || "FTP login failed. Check your credentials.");
              setStage("error");
              return;
            }
            // Other errors: record and continue
            const batchClipCount = batches[i]?.length ?? clipCount;
            totalFailed += batchClipCount;
            totalClips += batchClipCount;
            batchErrors++;
            continue;
          }

          allResults.push(...(data.results ?? []));
          totalSucceeded += data.succeeded ?? 0;
          totalFailed += data.failed ?? 0;
          totalClips += data.total ?? 0;
        } catch (batchErr) {
          // Network error on this batch - continue with next
          const batchClipCount = batches[i]?.length ?? clipCount;
          totalFailed += batchClipCount;
          totalClips += batchClipCount;
          batchErrors++;
        }
      }

      setResults(allResults);
      setSummary({ total: totalClips, succeeded: totalSucceeded, failed: totalFailed });

      if (totalSucceeded === 0 && batchErrors > 0) {
        setErrorMsg(
          "No clips made it through. Most often this means your Blackbox email or password is wrong, " +
          "or your Blackbox account is not yet approved. If credentials are correct, try again in a few minutes -- " +
          "Blackbox's FTP server may be briefly overloaded."
        );
        setStage("error");
      } else {
        setStage("done");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error during transfer.");
      setStage("error");
    }
  }

  function reset() {
    setStage("idle");
    setResults([]);
    setErrorMsg("");
    setPassword("");
  }

  return (
    <>
      {/* Trigger button */}
      {canFtp ? (
        <button
          onClick={() => setStage("credentials")}
          className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-400 transition hover:bg-violet-500/20 hover:border-violet-500/60"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Send to Blackbox via FTP
          {canProRes && <span className="ml-1 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">ProRes</span>}
        </button>
      ) : (
        <a
          href="/pricing"
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-semibold text-zinc-500 cursor-pointer hover:border-zinc-600 transition"
          title="Upgrade to Starter or higher to unlock FTP transfer"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          FTP Transfer — Pro+
        </a>
      )}

      {/* Modal */}
      {stage !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                  <svg className="h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Send to Blackbox.global</h2>
                  <p className="text-xs text-muted-foreground">FTP transfer to your Blackbox account</p>
                </div>
              </div>
              {stage !== "transferring" && (
                <button onClick={reset} className="text-muted-foreground hover:text-foreground transition text-xl leading-none">×</button>
              )}
            </div>

            {/* Credentials stage */}
            {stage === "credentials" && (
              <div className="px-6 py-5 space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Enter your <strong className="text-foreground">Blackbox.global</strong> login credentials. ClipMeta will FTP your {clipCount} clip{clipCount !== 1 ? "s" : ""} directly to your Blackbox <code className="text-violet-400">stock_footage</code> folder. Your credentials are never stored.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Blackbox Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Blackbox Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Your Blackbox password"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition text-xs"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
                    Cancel
                  </button>
                  <button
                    onClick={startTransfer}
                    disabled={!email.trim() || !password.trim()}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Start Transfer — {clipCount} clip{clipCount !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}

            {/* Transferring stage */}
            {stage === "transferring" && (
              <div className="px-6 py-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative h-16 w-16">
                    <svg className="h-16 w-16 animate-spin text-violet-500/20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <svg className="absolute inset-0 h-16 w-16 animate-spin text-violet-500" style={{ animationDuration: '1s' }} viewBox="0 0 24 24" fill="none">
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {batchProgress.total > 1
                      ? `Transferring clip ${batchProgress.current} of ${batchProgress.total}…`
                      : `Transferring ${clipCount} clip${clipCount !== 1 ? 's' : ''} to Blackbox…`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Large files can take 15-30 seconds each. Don't close this window.</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Files are being streamed from ClipMeta storage directly to <strong className="text-foreground">portal.blackbox.global</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Done stage */}
            {stage === "done" && (
              <div className="px-6 py-5 space-y-4">
                <div className={`rounded-lg border px-4 py-3 ${summary.failed === 0 ? 'border-green-500/30 bg-green-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{summary.failed === 0 ? '✅' : '⚠️'}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {summary.succeeded} of {summary.total} clips transferred
                      </p>
                      {summary.failed > 0 && (
                        <p className="text-xs text-amber-400">{summary.failed} clip{summary.failed !== 1 ? 's' : ''} failed — see details below</p>
                      )}
                    </div>
                  </div>
                </div>

                {results.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                    {results.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-0">
                        <span className="text-xs text-muted-foreground truncate max-w-[280px]">{r.filename}</span>
                        {r.status === "ok" ? (
                          <span className="text-xs text-green-400 shrink-0 ml-2">✓ sent</span>
                        ) : (
                          <span className="text-xs text-red-400 shrink-0 ml-2" title={r.error}>✗ failed</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3 space-y-1.5">
                  <p className="text-xs font-semibold text-violet-400">Next step: Import your CSV in Blackbox</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your clips will appear in the Blackbox <strong className="text-foreground">Workspace</strong> tab within a few minutes. Then use the <strong className="text-foreground">CSV/XLS import</strong> method to apply the metadata — download your CSV from ClipMeta first.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={`/api/export/csv?project_id=${projectId}&platform=blackbox`}
                    download
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    Download Blackbox CSV
                  </a>
                  <div className="flex gap-2">
                    <a
                      href="https://www.blackbox.global/my-account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
                    >
                      Go to Blackbox →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Error stage */}
            {stage === "error" && (
              <div className="px-6 py-5 space-y-4">
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <p className="text-sm font-semibold text-red-400">Transfer failed</p>
                  <p className="text-xs text-red-400/80 mt-1">{errorMsg}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground">Common fixes:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                    <li>• Make sure your email is all lowercase</li>
                    <li>• Use the same password you use to log into blackbox.global</li>
                    <li>• Try logging into Blackbox in your browser first to confirm credentials</li>
                    <li>• Check that your Blackbox account is fully registered and approved</li>
                  </ul>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition">
                    Close
                  </button>
                  <button onClick={() => setStage("credentials")} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition">
                    Try Again
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
