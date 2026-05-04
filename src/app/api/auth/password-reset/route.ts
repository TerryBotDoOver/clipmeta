import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

const FROM = process.env.RESEND_FROM || "ClipMeta <hello@clipmeta.app>";

function cleanBaseUrl(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\\r|\\n/g, "").replace(/[\r\n]/g, "").trim().replace(/\/$/, "");
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resetEmailHtml(resetLink: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:28px;color:#111827">
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25">Reset your ClipMeta password</h1>
      <p style="margin:0 0 20px;color:#4b5563;line-height:1.6">
        Use the secure link below to choose a new password for your ClipMeta account.
      </p>
      <p style="margin:28px 0">
        <a href="${resetLink}" style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px">
          Set a new password
        </a>
      </p>
      <p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.6">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="word-break:break-all;margin:0 0 24px;font-size:12px;line-height:1.6;color:#4b5563">
        ${resetLink}
      </p>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">
        If you did not request this password reset, you can ignore this email.
      </p>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px">ClipMeta</p>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail((body as { email?: unknown }).email);

    if (!validEmail(email)) {
      return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
    }

    const baseUrl = cleanBaseUrl(process.env.NEXT_PUBLIC_APP_URL, request.nextUrl.origin);
    const redirectTo = `${baseUrl}/auth/reset-password`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (error) {
      const message = error.message || "";
      if (/user.*not.*found|not found/i.test(message)) {
        return NextResponse.json({ success: true });
      }
      console.error("[password-reset] Failed to generate recovery link:", message);
      return NextResponse.json({ message: "We could not send a reset link right now. Please try again in a few minutes." }, { status: 500 });
    }

    const resetLink = data.properties?.action_link;
    if (!resetLink) {
      console.error("[password-reset] Supabase did not return an action link.");
      return NextResponse.json({ message: "We could not send a reset link right now. Please try again in a few minutes." }, { status: 500 });
    }

    const { error: sendError } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: "Reset your ClipMeta password",
      html: resetEmailHtml(resetLink),
      text: [
        "Reset your ClipMeta password",
        "",
        "Use this secure link to choose a new password:",
        resetLink,
        "",
        "If you did not request this password reset, you can ignore this email.",
        "",
        "ClipMeta",
      ].join("\n"),
    });

    if (sendError) {
      console.error("[password-reset] Resend failed:", sendError.message);
      return NextResponse.json({ message: "We could not send a reset link right now. Please try again in a few minutes." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[password-reset] Unexpected failure:", error);
    return NextResponse.json({ message: "We could not send a reset link right now. Please try again in a few minutes." }, { status: 500 });
  }
}
