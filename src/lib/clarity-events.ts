"use client";

export type ClarityEventName =
  | "BeginCheckout"
  | "Purchase"
  | "Subscribe"
  | "TrialStart"
  | "ProjectCreated"
  | "ClipUploaded"
  | "MetadataGenerated";

declare global {
  interface Window {
    clarity?: (command: "event", eventName: string) => void;
  }
}

export function trackClarityEvent(eventName: ClarityEventName) {
  if (typeof window === "undefined" || typeof window.clarity !== "function") return;

  try {
    window.clarity("event", eventName);
  } catch (error) {
    console.warn("[clarity] smart event failed", eventName, error);
  }
}
