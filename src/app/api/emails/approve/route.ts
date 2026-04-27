import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyEmailApprovalToken } from "@/lib/emailApproval";

const FROM = "ClipMeta <hello@clipmeta.app>";

type ApprovalAction = "send" | "discard";

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
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:720px;margin:48px auto;padding:0 20px;line-height:1.5;color:#111}code{background:#f3f4f6;padding:2px 5px;border-radius:4px}pre{white-space:pre-wrap;background:#f4f4f5;border-radius:8px;padding:16px;overflow:auto}button{background:#111;color:#fff;border:0;border-radius:8px;padding:10px 14px;font:inherit;cursor:pointer}.danger{background:#b91c1c}.muted{color:#666}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function parseAction(value: string | null): ApprovalAction | null {
  return value === "send" || value === "discard" ? value : null;
}

async function getEmail(emailId: string) {
  return supabaseAdmin
    .from("inbound_emails")
    .select("id, from_address, subject, status, reply_text")
    .eq("id", emailId)
    .maybeSingle();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const emailId = url.searchParams.get("emailId");
  const action = parseAction(url.searchParams.get("action"));
  const token = url.searchParams.get("token");

  if (!emailId || !action) {
    return htmlPage("Invalid approval link", "<p>This approval link is missing required information.</p>");
  }

  if (!verifyEmailApprovalToken(emailId, action, token)) {
    return htmlPage("Invalid approval link", "<p>This approval link is invalid or expired.</p>");
  }

  const { data: email, error } = await getEmail(emailId);
  if (error) return htmlPage("Approval failed", `<p>${escapeHtml(error.message)}</p>`);
  if (!email) return htmlPage("Email not found", "<p>This inbound email was not found.</p>");
  if (email.status === "replied") return htmlPage("Already sent", "<p>This email has already been replied to.</p>");
  if (email.status === "discarded") return htmlPage("Already discarded", "<p>This draft has already been discarded.</p>");

  const replyText = typeof email.reply_text === "string" ? email.reply_text.trim() : "";
  if (action === "send" && !replyText) {
    return htmlPage("No draft found", "<p>This email does not have a draft reply saved.</p>");
  }

  const buttonClass = action === "discard" ? "danger" : "";
  const buttonText = action === "discard" ? "Discard draft" : "Send this reply";
  const explainer = action === "discard"
    ? "This will discard the saved draft. No email will be sent."
    : "Review the saved draft below. Press the button only when you want to send it.";

  return htmlPage(
    action === "discard" ? "Confirm discard" : "Confirm send",
    `
      <p class="muted">${explainer}</p>
      <p><strong>To:</strong> ${escapeHtml(email.from_address || "(unknown)")}</p>
      <p><strong>Subject:</strong> ${escapeHtml(email.subject || "(no subject)")}</p>
      ${replyText ? `<h2>Draft</h2><pre>${escapeHtml(replyText)}</pre>` : ""}
      <form method="post">
        <input type="hidden" name="emailId" value="${escapeHtml(emailId)}">
        <input type="hidden" name="action" value="${escapeHtml(action)}">
        <input type="hidden" name="token" value="${escapeHtml(token)}">
        <button class="${buttonClass}" type="submit">${buttonText}</button>
      </form>
    `
  );
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const emailId = String(formData.get("emailId") || "");
  const action = parseAction(String(formData.get("action") || ""));
  const token = String(formData.get("token") || "");

  if (!emailId || !action) {
    return htmlPage("Invalid approval request", "<p>This approval request is missing required information.</p>");
  }

  if (!verifyEmailApprovalToken(emailId, action, token)) {
    return htmlPage("Invalid approval request", "<p>This approval request is invalid or expired.</p>");
  }

  const { data: email, error } = await getEmail(emailId);
  if (error) return htmlPage("Approval failed", `<p>${escapeHtml(error.message)}</p>`);
  if (!email) return htmlPage("Email not found", "<p>This inbound email was not found.</p>");
  if (email.status === "replied") return htmlPage("Already sent", "<p>This email has already been replied to.</p>");
  if (email.status === "discarded") return htmlPage("Already discarded", "<p>This draft has already been discarded.</p>");

  if (action === "discard") {
    await supabaseAdmin
      .from("inbound_emails")
      .update({ status: "discarded" })
      .eq("id", emailId);

    return htmlPage("Draft discarded", "<p>The draft was discarded. No email was sent.</p>");
  }

  const replyText = typeof email.reply_text === "string" ? email.reply_text.trim() : "";
  if (!replyText) {
    return htmlPage("No draft found", "<p>This email does not have a draft reply saved.</p>");
  }

  const to = typeof email.from_address === "string" ? email.from_address.trim() : "";
  if (!to) {
    return htmlPage("Missing recipient", "<p>This inbound email is missing a reply address.</p>");
  }

  const storedSubject = typeof email.subject === "string" && email.subject.trim()
    ? email.subject.trim()
    : "(no subject)";
  const subject = /^re:/i.test(storedSubject) ? storedSubject : `Re: ${storedSubject}`;

  const { error: sendError } = await getResend().emails.send({
    from: FROM,
    to,
    subject,
    text: replyText,
  });

  if (sendError) {
    return htmlPage("Send failed", `<p>${escapeHtml(sendError.message)}</p>`);
  }

  await supabaseAdmin
    .from("inbound_emails")
    .update({
      status: "replied",
      replied_at: new Date().toISOString(),
      reply_text: replyText,
    })
    .eq("id", emailId);

  return htmlPage("Reply sent", `<p>Sent the saved draft reply to <code>${escapeHtml(to)}</code>.</p>`);
}
