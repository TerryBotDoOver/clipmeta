"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const POPUP_SHOWN_KEY = "promo_reward_popup_shown";

// Tiered discount windows (hours after promo_unlocked_at):
//   0-24h:  50% off (Tier 1)
//   24-72h: 25% off (Tier 2)
//   72h+:   expired
const TIER_1_HOURS = 24;
const TIER_2_HOURS = 72;

type PromoTier = { percent: number; label: string; expiresAt: number; nextTierAt: number | null; nextPercent: number | null };

function getTier(unlockedAt: Date): PromoTier | null {
  const unlockMs = unlockedAt.getTime();
  const now = Date.now();
  const hoursElapsed = (now - unlockMs) / (1000 * 60 * 60);

  if (hoursElapsed < TIER_1_HOURS) {
    return {
      percent: 50,
      label: "50% off",
      expiresAt: unlockMs + TIER_1_HOURS * 60 * 60 * 1000,
      nextTierAt: unlockMs + TIER_1_HOURS * 60 * 60 * 1000,
      nextPercent: 25,
    };
  } else if (hoursElapsed < TIER_2_HOURS) {
    return {
      percent: 25,
      label: "25% off",
      expiresAt: unlockMs + TIER_2_HOURS * 60 * 60 * 1000,
      nextTierAt: null,
      nextPercent: null,
    };
  }
  return null; // Expired
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "00:00:00";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PromoReward() {
  const [tier, setTier] = useState<PromoTier | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [loading, setLoading] = useState(true);

  const checkPromoState = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("promo_unlocked_at, plan")
      .eq("id", user.id)
      .single();

    // Problem 2 fix: if user is already on a paid plan, NEVER show the promo.
    // They either used it or skipped it — showing it now would make them feel ripped off.
    if (profile?.plan && profile.plan !== "free") {
      setLoading(false);
      return;
    }

    if (profile?.promo_unlocked_at) {
      const ts = new Date(profile.promo_unlocked_at);
      const currentTier = getTier(ts);
      if (currentTier) {
        setTier(currentTier);
        // Show popup only once per unlock (not on every page load)
        const popupKey = `${POPUP_SHOWN_KEY}_${ts.getTime()}`;
        if (!localStorage.getItem(popupKey)) {
          setShowPopup(true);
          localStorage.setItem(popupKey, "true");
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkPromoState();
    const handler = () => setTimeout(() => checkPromoState(), 500);
    window.addEventListener("clipmeta:onboarding-complete", handler);
    return () => window.removeEventListener("clipmeta:onboarding-complete", handler);
  }, []);

  // Countdown ticker — counts down to the CURRENT tier's expiry
  useEffect(() => {
    if (!tier) return;
    const update = () => {
      const remaining = tier.expiresAt - Date.now();
      if (remaining <= 0) {
        // Tier expired — check if there's a next tier
        checkPromoState();
        return;
      }
      setCountdown(formatCountdown(remaining));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tier]);

  if (loading || !tier) return null;

  const gradientBg = tier.percent === 50
    ? "linear-gradient(90deg, #6d28d9 0%, #db2777 50%, #f59e0b 100%)"
    : "linear-gradient(90deg, #6d28d9 0%, #4f46e5 50%, #3b82f6 100%)";

  return (
    <>
      {/* Top banner (visible when popup is closed) */}
      {!showPopup && (
        <div
          style={{
            background: gradientBg,
            color: "#ffffff",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            fontSize: "14px",
            fontWeight: 600,
            flexWrap: "wrap",
          }}
        >
          <span>🎉 {tier.label} your first month —</span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "15px",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "6px",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            {countdown}
          </span>
          {tier.nextPercent && (
            <span style={{ fontSize: "12px", opacity: 0.85 }}>
              then {tier.nextPercent}% off for {TIER_2_HOURS - TIER_1_HOURS}h
            </span>
          )}
          <Link
            href="/pricing"
            style={{
              color: "#ffffff",
              fontWeight: 700,
              textDecoration: "underline",
              whiteSpace: "nowrap",
            }}
          >
            Claim Now →
          </Link>
        </div>
      )}

      {/* Popup celebration */}
      {showPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowPopup(false)}
        >
          {/* Sparkles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  fontSize: `${12 + Math.random() * 24}px`,
                  animation: `sparkle ${1.5 + Math.random() * 2}s ease-out ${Math.random() * 1.5}s infinite`,
                }}
              >
                {["✨", "🎉", "⭐", "💫", "🎊"][Math.floor(Math.random() * 5)]}
              </span>
            ))}
          </div>

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 mx-4 max-w-md animate-in zoom-in-95 fade-in duration-500"
            style={{
              background: gradientBg,
              borderRadius: "9999px",
              padding: "48px 40px",
              boxShadow: "0 25px 60px -10px rgba(109, 40, 217, 0.5), 0 0 120px -20px rgba(245, 158, 11, 0.4)",
              textAlign: "center",
              color: "#ffffff",
            }}
          >
            <button
              onClick={() => setShowPopup(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "16px",
                right: "20px",
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "16px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              ×
            </button>

            <div style={{ fontSize: "44px", marginBottom: "8px" }}>🎉</div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px", lineHeight: 1.2 }}>
              You&apos;ve unlocked
            </h2>
            <h2 style={{ fontSize: "32px", fontWeight: 900, marginBottom: "12px", lineHeight: 1 }}>
              {tier.label} your first month!
            </h2>

            {/* Tier countdown */}
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "26px",
                fontWeight: 800,
                padding: "10px 24px",
                borderRadius: "9999px",
                background: "rgba(0,0,0,0.3)",
                display: "inline-block",
                marginBottom: "12px",
                letterSpacing: "1px",
              }}
            >
              {countdown}
            </div>

            {/* Show the tier step-down info */}
            {tier.nextPercent && (
              <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "20px" }}>
                After this countdown, your reward drops to <strong>{tier.nextPercent}% off</strong> for {TIER_2_HOURS - TIER_1_HOURS} more hours — then it&apos;s gone.
              </p>
            )}
            {!tier.nextPercent && (
              <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "20px" }}>
                This is your last chance — when this timer hits zero, the discount is gone.
              </p>
            )}

            <div>
              <Link
                href="/pricing"
                onClick={() => setShowPopup(false)}
                style={{
                  display: "inline-block",
                  background: "#ffffff",
                  color: "#6d28d9",
                  fontWeight: 800,
                  padding: "14px 32px",
                  borderRadius: "9999px",
                  textDecoration: "none",
                  fontSize: "15px",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                }}
              >
                Claim Your Discount →
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes sparkle {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
          100% { opacity: 0; transform: scale(0) rotate(360deg); }
        }
      `}</style>
    </>
  );
}
