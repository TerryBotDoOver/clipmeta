"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackClarityEvent } from "@/lib/clarity-events";

export function ProjectCreatedTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("created") !== "true") return;

    const key = `clipmeta:clarity:project-created:${window.location.pathname}`;
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "true");
    trackClarityEvent("ProjectCreated");
  }, [searchParams]);

  return null;
}
