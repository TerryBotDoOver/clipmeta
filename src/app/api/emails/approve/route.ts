import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyEmailApprovalToken } from "@/lib/emailApproval";

const FROM = "ClipMeta <hello@clipmeta.app>";

function htmlPage(title: string, body: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:640px;margin:48px auto;padding:0 20px;line-height:1.5;color:#111}code{background:#f3f4f6;padding:2px 5px;border-radius:4px}</style></head><body><h1>${title}</h1><p>${body}</p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const emailId = url.searchParams.get("emailId");
  const action = url.searchParams.get("action");
  const token = url.searchParams.get("token");

  if (!emailId || (action !== "send" && action !== "discard")) {
    return htmlPage("Invalid approval link", "This approval link is missing required information.");
  }

  if (!verifyEmailApprovalToken(emailId, action, token)) {
    return htmlPage("Invalid approval link", "This approval link is invalid or expired.");
  }

  const { data: email, error } = await supabaseAdmin
    .from("inbound_emails")
    .select("id, from_address, subject, status, reply_text")
    .eq("id", emailId)
    .maybeSingle();

  if (error) {
    return htmlPage("Approval failed", error.message);
  }

  if (!email) {
    return htmlPage("Email not found", "This inbound email was not found.");
  }

  if (email.status === "replied") {
    return htmlPage("Already sent", "This email has already been replied to.");
  }

  if (action === "discard") {
    await supabaseAdmin
      .from("inbound_emails")
      .update({ status: "discarded" })
      .eq("id", emailId);

    return htmlPage("Draft discarded", "The draft was discarded. No email was sent.");
  }

  const replyText = typeof email.reply_text === "string" ? email.reply_text.trim() : "";
  if (!replyText) {
    return htmlPage("No draft found", "This email does not have a draft reply saved.");
  }

  const to = typeof email.from_address === "string" ? email.from_address.trim() : "";
  if (!to) {
    return htmlPage("Missing recipient", "This inbound email is missing a reply address.");
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
    return htmlPage("Send failed", sendError.message);
  }

  await supabaseAdmin
    .from("inbound_emails")
    .update({
      status: "replied",
      replied_at: new Date().toISOString(),
      reply_text: replyText,
    })
    .eq("id", emailId);

  return htmlPage("Reply sent", `Sent the saved draft reply to <code>${to}</code>.`);
}
