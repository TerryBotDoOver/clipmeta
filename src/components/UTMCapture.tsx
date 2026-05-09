"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function UTMCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Don't overwrite if already captured
    if (localStorage.getItem("clipmeta_utm")) return;

    const utm: Record<string, string> = {};

    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    for (const key of utmKeys) {
      const val = searchParams.get(key);
      if (val) utm[key] = val;
    }

    const clickIds = ["gclid", "fbclid", "msclkid", "rdt_cid"];
    for (const key of clickIds) {
      const val = searchParams.get(key);
      if (val) utm[key] = val;
    }

    if (document.referrer) {
      utm["referrer"] = document.referrer;
    }

    // Only store if we have something meaningful
    if (Object.keys(utm).length > 0) {
      utm["landing_path"] = `${window.location.pathname}${window.location.search}`;
      utm["captured_at"] = new Date().toISOString();
      localStorage.setItem("clipmeta_utm", JSON.stringify(utm));
    }
  }, [searchParams]);

  return null;
}
