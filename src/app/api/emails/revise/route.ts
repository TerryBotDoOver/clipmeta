import { NextRequest, NextResponse } from "next/server";
import { draftCustomerEmail } from "@/lib/customerEmailDraft";
import { DISCORD_CHANNELS, sendDiscordMessage } from "@/lib/discord";
import { emailApprovalUrl, emailReviseUrl, verifyEmailApprovalToken } from "@/lib/emailApproval";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildSupportResearchContext } from "@/lib/supportResearchContext";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title: string, body: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.5;color:#111}textarea{box-sizing:border-box;width:100%;min-height:140px;border:1px solid #d4d4d8;border-radius:8px;padding:12px;font:inherit}pre{white-space:pre-wrap;background:#f4f4f5;border-radius:8px;padding:16px;overflow:auto}button{background:#111;color:#fff;border:0;border-radius:8px;padding:10px 14px;font:inherit;cursor:pointer}.muted{color:#666}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

async function getEmail(emailId: string) {
  return supabaseAdmin
    .from("inbound_emails")
    .select("id, from_address, subject, status, reply_text, body_text")
    .eq("id", emailId)
    .maybeSingle();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const emailId = url.searchParams.get("emailId");
  const token = url.searchParams.get("token");

  if (!emailId || !verifyEmailApprovalToken(emailId, "revise", token)) {
    return htmlPage("Invalid revise link", "<p>This revise link is invalid or expired.</p>");
  }

  const { data: email, error } = await getEmail(emailId);
  if (error) return htmlPage("Revise failed", `<p>${escapeHtml(error.message)}</p>`);
  if (!email) return htmlPage("Email not found", "<p>This inbound email was not found.</p>");
  if (email.status === "replied") return htmlPage("Already sent", "<p>This email has already been replied to.</p>");

  return htmlPage(
    "Revise draft",
    `
      <p class="muted">Add instructions for how Terry should rewrite this draft. Nothing is sent from this page.</p>
      <p><strong>From:</strong> ${escapeHtml(email.from_address)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(email.subject || "(no subject)")}</p>
      <h2>Current draft</h2>
      <pre>${escapeHtml(email.reply_text || "")}</pre>
      <form method="post">
        <input type="hidden" name="emailId" value="${escapeHtml(emailId)}">
        <input type="hidden" name="token" value="${escapeHtml(token)}">
        <label for="instructions"><strong>Revision instructions</strong></label>
        <textarea id="instructions" name="instructions" placeholder="Example: Answer directly with the remaining upload count and keep it shorter."></textarea>
        <p><button type="submit">Regenerate draft</button></p>
      </form>
    `
  );
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const emailId = String(formData.get("emailId") || "");
  const token = String(formData.get("token") || "");
  const instructions = String(formData.get("instructions") || "").trim();

  if (!emailId || !verifyEmailApprovalToken(emailId, "revise", token)) {
    return htmlPage("Invalid revise link", "<p>This revise link is invalid or expired.</p>");
  }

  if (!instructions) {
    return htmlPage("Missing instructions", "<p>Add revision instructions before regenerating.</p>");
  }

  const { data: email, error } = await getEmail(emailId);
  if (error) return htmlPage("Revise failed", `<p>${escapeHtml(error.message)}</p>`);
  if (!email) return htmlPage("Email not found", "<p>This inbound email was not found.</p>");
  if (email.status === "replied") return htmlPage("Already sent", "<p>This email has already been replied to.</p>");

  const accountContext = await buildSupportResearchContext({
    from: email.from_address || "(unknown)",
    subject: email.subject || "(no subject)",
    body: email.body_text || "",
    currentEmailId: emailId,
  });

  const draft = await draftCustomerEmail({
    from: email.from_address || "(unknown)",
    subject: email.subject || "(no subject)",
    body: email.body_text || "",
    accountContext,
    currentDraft: email.reply_text || "",
    revisionInstructions: instructions,
  });

  await supabaseAdmin
    .from("inbound_emails")
    .update({
      status: "pending_approval",
      reply_text: draft,
    })
    .eq("id", emailId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clipmeta.app";
  await sendDiscordMessage({
    channelId: DISCORD_CHANNELS.emailApprovals,
    content: [
      "**Revised draft waiting for approval**",
      `From: ${email.from_address || "(unknown)"}`,
      `Subject: ${email.subject || "(no subject)"}`,
      "",
      draft,
      "",
      `Approve and send: ${emailApprovalUrl(baseUrl, emailId, "send")}`,
      `Discard draft: ${emailApprovalUrl(baseUrl, emailId, "discard")}`,
      `Revise again: ${emailReviseUrl(baseUrl, emailId)}`,
    ].join("\n"),
  });

  return htmlPage(
    "Draft regenerated",
    `
      <p>The revised draft was saved and posted to Discord for approval.</p>
      <h2>New draft</h2>
      <pre>${escapeHtml(draft)}</pre>
    `
  );
}
