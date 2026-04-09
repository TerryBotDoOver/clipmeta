"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<"checking" | "sending" | "success" | "error" | "no-session">("checking");

  useEffect(() => {
    async function sendTokenToExtension() {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setStatus("no-session");
        return;
      }

      setStatus("sending");

      // Send token to the Chrome extension via postMessage
      // The extension's content script listens for this on clipmeta.app pages
      try {
        window.postMessage(
          {
            type: "CLIPMETA_AUTH_TOKEN",
            token: session.access_token,
            email: session.user?.email || "",
          },
          "*"
        );
        setStatus("success");
      } catch {
        setStatus("error");
      }
    }

    sendTokenToExtension();
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <img src="/logo-icon.svg" className="h-12 w-12 mx-auto mb-4" alt="ClipMeta" />
          <h1 className="text-xl font-bold text-foreground mb-4">ClipMeta Chrome Extension</h1>

          {status === "checking" && (
            <p className="text-muted-foreground">Checking login status...</p>
          )}

          {status === "sending" && (
            <p className="text-muted-foreground">Connecting to extension...</p>
          )}

          {status === "success" && (
            <div>
              <div className="text-4xl mb-4">✅</div>
              <p className="text-foreground font-semibold mb-2">Connected!</p>
              <p className="text-sm text-muted-foreground mb-6">
                Your ClipMeta account is now linked to the Chrome extension. You can close this tab and go back to Blackbox.
              </p>
              <button
                onClick={() => window.close()}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Close This Tab
              </button>
            </div>
          )}

          {status === "no-session" && (
            <div>
              <p className="text-muted-foreground mb-4">
                You need to log in to ClipMeta first.
              </p>
              <a
                href="/auth"
                className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Log In
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                After logging in, come back to this page.
              </p>
            </div>
          )}

          {status === "error" && (
            <div>
              <p className="text-red-400 mb-4">Something went wrong. Please try again.</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
