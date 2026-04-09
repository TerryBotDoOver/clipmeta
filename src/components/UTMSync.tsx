"use client";

import { useEffect } from "react";

export function UTMSync() {
  useEffect(() => {
    if (localStorage.getItem("clipmeta_utm_synced")) return;

    const raw = localStorage.getItem("clipmeta_utm");
    if (!raw) return;

    let utm: Record<string, string>;
    try {
      utm = JSON.parse(raw);
    } catch {
      return;
    }

    fetch("/api/profile/utm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(utm),
    }).then((res) => {
      if (res.ok) {
        localStorage.setItem("clipmeta_utm_synced", "1");
      }
    }).catch(() => {
      // Non-fatal, will retry next visit
    });
  }, []);

  return null;
}
