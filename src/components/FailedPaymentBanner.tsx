"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const FAILED_PAYMENT_STATUSES = new Set([
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
]);

type BillingState = {
  status: string | null;
  loading: boolean;
  portalLoading: boolean;
  error: string | null;
};

function isLocalPreview() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("preview_failed_payment") === "1" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  );
}

export function FailedPaymentBanner() {
  const [state, setState] = useState<BillingState>({
    status: null,
    loading: true,
    portalLoading: false,
    error: null,
  });

  const preview = useMemo(() => isLocalPreview(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadBillingStatus() {
      if (preview) {
        setState((current) => ({ ...current, loading: false, status: "past_due" }));
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        if (!cancelled) setState((current) => ({ ...current, loading: false }));
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("stripe_subscription_status")
        .eq("id", user.id)
        .single();

      if (cancelled) return;
      setState((current) => ({
        ...current,
        loading: false,
        status: data?.stripe_subscription_status ?? null,
        error: error?.message ?? null,
      }));
    }

    loadBillingStatus();
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const shouldShow =
    !state.loading &&
    !state.error &&
    state.status !== null &&
    FAILED_PAYMENT_STATUSES.has(state.status);

  async function openBillingPortal() {
    setState((current) => ({ ...current, portalLoading: true }));
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setState((current) => ({
        ...current,
        portalLoading: false,
        error: data?.error ?? "Could not open billing portal.",
      }));
    } catch {
      setState((current) => ({
        ...current,
        portalLoading: false,
        error: "Could not open billing portal.",
      }));
    }
  }

  if (!shouldShow) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-300">Payment needs attention</p>
          <p className="mt-1 text-sm text-amber-100/90">
            We could not process your subscription payment, so your account is temporarily on the Free plan. Update your payment method to restore your paid clip allowance and larger uploads.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={openBillingPortal}
            disabled={state.portalLoading || preview}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.portalLoading ? "Opening..." : "Update payment"}
          </button>
          <Link
            href="/pricing"
            className="rounded-lg border border-amber-300/40 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/10"
          >
            View plans
          </Link>
        </div>
      </div>
    </div>
  );
}
