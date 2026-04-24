"use client";

import { useEffect } from "react";

// Microsoft Clarity (heatmaps + session replay). Free, feeds Microsoft's Bing
// Ads / Copilot data pipeline in exchange for the free tool. Installed via the
// official @microsoft/clarity package because it keeps the root layout a
// server component and avoids an inline <script> tag in <head>.
//
// Passwords and form fields are auto-masked by default. Text content is also
// masked unless we opt in -- keep it masked, we have nothing to learn from
// reading actual filenames or emails in replays.
export default function ClarityAnalytics() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CLARITY_ID;
    if (!id) return; // Gracefully no-op in previews / local without the env var.
    // Dynamic import so the package never ships in SSR bundles.
    import("@microsoft/clarity").then(({ default: Clarity }) => {
      try {
        Clarity.init(id);
      } catch (err) {
        // Never surface analytics errors to users.
        console.warn("[clarity] init failed:", err);
      }
    });
  }, []);

  return null;
}
