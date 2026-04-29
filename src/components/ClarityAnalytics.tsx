"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

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
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    const id = process.env.NEXT_PUBLIC_CLARITY_ID;
    if (!id) return; // Gracefully no-op in previews / local without the env var.

    // Dynamic import so the package never ships in SSR bundles.
    import("@microsoft/clarity").then(async ({ default: Clarity }) => {
      try {
        Clarity.init(id);
        const supabase = createSupabaseBrowserClient();
        const identify = async (user: User | null) => {
          if (!mounted) return;
          if (!user?.id) {
            Clarity.setTag("clipmeta_auth", "signed_out");
            return;
          }

          const plan = await loadPlanTag(user.id);
          const userHash = await sha256Hex(user.id);

          Clarity.identify(user.id);
          Clarity.setTag("clipmeta_auth", "signed_in");
          Clarity.setTag("clipmeta_plan", plan);
          if (userHash) Clarity.setTag("clipmeta_user_hash", userHash);
          Clarity.upgrade("clipmeta_signed_in");
        };

        const {
          data: { user },
        } = await supabase.auth.getUser();
        await identify(user);

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          void identify(session?.user ?? null);
        });
        unsubscribe = () => data.subscription.unsubscribe();
      } catch (err) {
        // Never surface analytics errors to users.
        console.warn("[clarity] init failed:", err);
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  return null;
}

async function loadPlanTag(userId: string) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("profiles")
      .select("plan, referral_pro_forever, referral_pro_until")
      .eq("id", userId)
      .single();

    if (
      data?.referral_pro_forever ||
      (data?.referral_pro_until && new Date(data.referral_pro_until as string) > new Date())
    ) {
      return "pro";
    }

    return typeof data?.plan === "string" && data.plan ? data.plan : "free";
  } catch {
    return "unknown";
  }
}

async function sha256Hex(value: string) {
  try {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}
