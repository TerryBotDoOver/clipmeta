"use client";

import Link from "next/link";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  upgradeMessage?: string;
  upgradeUrl?: string;
  onClose: () => void;
};

export function LimitReachedModal({
  open,
  title = "Limit Reached",
  message,
  upgradeMessage,
  upgradeUrl = "/pricing",
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 mx-4 max-w-md animate-in zoom-in-95 fade-in duration-300"
        style={{
          background: "linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #f59e0b 100%)",
          borderRadius: "32px",
          padding: "40px 36px",
          boxShadow:
            "0 25px 60px -10px rgba(109, 40, 217, 0.5), 0 0 120px -20px rgba(245, 158, 11, 0.4)",
          textAlign: "center",
          color: "#ffffff",
        }}
      >
        <button
          onClick={onClose}
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

        <div style={{ fontSize: "44px", marginBottom: "8px" }}>⚡</div>
        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px", lineHeight: 1.2 }}>
          {title}
        </h2>
        <p style={{ fontSize: "14px", opacity: 0.95, marginBottom: upgradeMessage ? "12px" : "24px", lineHeight: 1.5 }}>
          {message}
        </p>
        {upgradeMessage && (
          <p
            style={{
              fontSize: "13px",
              opacity: 0.9,
              marginBottom: "24px",
              padding: "10px 16px",
              borderRadius: "12px",
              background: "rgba(0,0,0,0.2)",
              lineHeight: 1.5,
            }}
          >
            {upgradeMessage}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={upgradeUrl}
            onClick={onClose}
            style={{
              display: "inline-block",
              background: "#ffffff",
              color: "#6d28d9",
              fontWeight: 800,
              padding: "13px 28px",
              borderRadius: "9999px",
              textDecoration: "none",
              fontSize: "14px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
            }}
          >
            Upgrade Plan →
          </Link>
          <button
            onClick={onClose}
            style={{
              display: "inline-block",
              background: "transparent",
              color: "#ffffff",
              fontWeight: 600,
              padding: "13px 28px",
              borderRadius: "9999px",
              border: "1px solid rgba(255,255,255,0.3)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
