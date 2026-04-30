import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { draftCustomerEmail } from "@/lib/customerEmailDraft";
import { DISCORD_CHANNELS, sendDiscordMessage } from "@/lib/discord";
import { emailApprovalUrl, emailReviseUrl } from "@/lib/emailApproval";
import { PLANS, Plan } from "@/lib/plans";
import { getResend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildSupportResearchContext } from "@/lib/supportResearchContext";

const FROM = process.env.RESEND_FROM || "ClipMeta <hello@clipmeta.app>";
const CODEX_EMAIL_DRAFTS_ENABLED = process.env.CODEX_EMAIL_DRAFTS_ENABLED === "true";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const { category, subject, message, email, name } = await req.json();
    const cleanSubject = String(subject || "").trim();
    const cleanMessage = String(message || "").trim();
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanName = typeof name === "string" ? name.trim() : "";

    if (!cleanSubject || !cleanMessage) {
      return NextResponse.json({ message: "Subject and message are required." }, { status: 400 });
    }

    let userId = "unknown";
    let authenticatedUserId: string | null = null;
    let userPlan = "free";
    let accountContext = "";
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        authenticatedUserId = user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, regens_used_this_month, billing_period_start")
          .eq("id", user.id)
          .single();

        userPlan = profile?.plan ?? "free";
        const planInfo = PLANS[userPlan as Plan] ?? PLANS.free;
        const billingStart = profile?.billing_period_start
          ? new Date(profile.billing_period_start as string).toISOString()
          : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const [{ count: clipsUsed }, { count: lifetimeClips }] = await Promise.all([
          supabaseAdmin
            .from("clip_history")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("action", "created")
            .gte("created_at", billingStart),
          supabaseAdmin
            .from("clip_history")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("action", "created"),
        ]);

        const used = clipsUsed ?? 0;
        const remaining = Math.max(0, planInfo.clips - used);
        accountContext = [
          `Authenticated user id: ${user.id}`,
          `Plan: ${planInfo.name}`,
          `Current billing period start: ${billingStart}`,
          `Clip uploads used this billing period: ${used}`,
          `Clip upload limit this billing period: ${planInfo.clips}`,
          `Clip uploads remaining this billing period: ${remaining}`,
          `Lifetime clip uploads: ${lifetimeClips ?? 0}`,
          `Regenerations used this billing period: ${(profile as Record<string, unknown>)?.regens_used_this_month as number || 0}`,
          `Regeneration limit: ${planInfo.regensLabel}`,
        ].join("\n");
      }
    } catch {
      // Support submission should still work if profile lookup fails.
    }

    const categoryLabel = {
      billing: "Billing",
      bug: "Bug",
      account: "Account",
      csv: "CSV / Export",
      metadata: "Metadata",
      other: "Other",
    }[category as string] ?? String(category || "Other");

    const displayFrom = cleanName && cleanEmail
      ? `${cleanName} <${cleanEmail}>`
      : cleanEmail || cleanName || "(unknown)";
    const ticketSubject = `[Support] ${categoryLabel} - ${cleanSubject}`;
    const ticketBody = [
      `Category: ${categoryLabel}`,
      `From: ${displayFrom}`,
      `User ID: ${userId}`,
      `Plan: ${userPlan}`,
      `Subject: ${cleanSubject}`,
      "",
      cleanMessage,
    ].join("\n");

    let emailDbId: string | null = null;
    let draft = "";

    if (cleanEmail) {
      try {
        if (CODEX_EMAIL_DRAFTS_ENABLED) {
          const researchedContext = await buildSupportResearchContext({
            email: cleanEmail,
            from: displayFrom,
            subject: ticketSubject,
            body: ticketBody,
            authenticatedUserId,
            baseAccountContext: accountContext,
          });

          draft = await draftCustomerEmail({
            from: displayFrom,
            subject: ticketSubject,
            body: ticketBody,
            accountContext: researchedContext,
          });
        }

        const { data: insertedEmail, error: insertError } = await supabaseAdmin
          .from("inbound_emails")
          .insert({
            resend_email_id: `support-form:${randomUUID()}`,
            from_address: cleanEmail,
            to_address: "hello@clipmeta.app",
            subject: ticketSubject,
            body_text: ticketBody,
            body_html: "",
            attachments: [],
            received_at: new Date().toISOString(),
            status: CODEX_EMAIL_DRAFTS_ENABLED && draft ? "pending_approval" : "unread",
            reply_text: CODEX_EMAIL_DRAFTS_ENABLED && draft ? draft : null,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("[support] Failed to store support ticket in inbound_emails:", insertError);
        } else {
          emailDbId = insertedEmail?.id || null;
        }
      } catch (storeError) {
        console.error("[support] Failed to store support ticket in inbound_emails:", storeError);
      }
    }

    await sendDiscordMessage({
      channelId: DISCORD_CHANNELS.inbox,
      content: [
        "**New ClipMeta support ticket**",
        `From: ${displayFrom}`,
        `Category: ${categoryLabel}`,
        `Plan: ${userPlan}`,
        `User ID: ${userId}`,
        `Subject: ${cleanSubject}`,
        "",
        `Message: ${cleanMessage.slice(0, 800)}`,
      ].join("\n"),
    });

    if (CODEX_EMAIL_DRAFTS_ENABLED && emailDbId && draft) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clipmeta.app";
      await sendDiscordMessage({
        channelId: DISCORD_CHANNELS.emailApprovals,
        content: [
          "**Draft reply waiting for approval**",
          `From: ${displayFrom}`,
          `Subject: ${ticketSubject}`,
          "",
          draft,
          "",
          `Approve and send: ${emailApprovalUrl(baseUrl, emailDbId, "send")}`,
          `Discard draft: ${emailApprovalUrl(baseUrl, emailDbId, "discard")}`,
          `Revise draft: ${emailReviseUrl(baseUrl, emailDbId)}`,
        ].join("\n"),
      });
    }

    await getResend().emails.send({
      from: FROM,
      to: "hello@clipmeta.app",
      replyTo: cleanEmail || FROM,
      subject: ticketSubject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">New Support Ticket</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
            <tr><td style="padding:6px 0;color:#888;width:100px">Category</td><td><strong>${escapeHtml(categoryLabel)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#888">From</td><td>${escapeHtml(displayFrom)}</td></tr>
            <tr><td style="padding:6px 0;color:#888">User ID</td><td><code style="font-size:12px">${escapeHtml(userId)}</code></td></tr>
            <tr><td style="padding:6px 0;color:#888">Plan</td><td>${escapeHtml(userPlan)}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Subject</td><td><strong>${escapeHtml(cleanSubject)}</strong></td></tr>
          </table>
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.6">${escapeHtml(cleanMessage)}</div>
          <p style="margin-top:16px;font-size:12px;color:#888">Reply to this email to respond directly to the customer.</p>
        </div>
      `,
    });

    if (cleanEmail) {
      await getResend().emails.send({
        from: FROM,
        to: cleanEmail,
        subject: `We received your support request - ${cleanSubject}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 8px">Got your message</h2>
            <p style="color:#666;margin:0 0 24px">We'll get back to you within 24 hours at this email address.</p>
            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:#888">Your ticket</p>
              <p style="margin:4px 0 0;font-size:15px;font-weight:600">${escapeHtml(cleanSubject)}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#555;white-space:pre-wrap">${escapeHtml(cleanMessage.slice(0, 300))}${cleanMessage.length > 300 ? "..." : ""}</p>
            </div>
            <p style="font-size:13px;color:#888">The ClipMeta Team<br><a href="https://clipmeta.app" style="color:#8b5cf6">clipmeta.app</a></p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[support] Error:", err);
    return NextResponse.json({ message: "Failed to submit ticket." }, { status: 500 });
  }
}
