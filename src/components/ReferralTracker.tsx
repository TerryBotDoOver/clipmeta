"use client";

import { useEffect } from "react";

/**
 * Mounts on the dashboard. Checks localStorage for a pending referral
 * code (saved when the user landed on /auth?ref=XXXXXXXX) and submits
 * it to /api/referral/track now that the user is authenticated.
 */
export function ReferralTracker() {
  useEffect(() => {
    let pending: string | null = null;
    try {
      pending = localStorage.getItem("pendingReferral");
    } catch {}

    if (!pending) return;
    if (!/^[0-9a-f]{8}$/i.test(pending)) {
      try { localStorage.removeItem("pendingReferral"); } catch {}
      return;
    }

    fetch("/api/referral/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: pending }),
    })
      .then(() => {
        try { localStorage.removeItem("pendingReferral"); } catch {}
      })
      .catch(() => {
        // Leave it in storage so we can retry on next visit
      });
  }, []);

  return null;
}
