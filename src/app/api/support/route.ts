import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const FROM = process.env.RESEND_FROM || "ClipMeta <hello@clipmeta.app>";

export async function POST(req: NextRequest) {
  try {
    const { category, subject, message, email, name } = await req.json();

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ message: "Subject and message are required." }, { status: 400 });
    }

    // Get user from session for additional context
    let userId = "unknown";
    let userPlan = "free";
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
        userPlan = profile?.plan ?? "free";
      }
    } catch { /* non-fatal */ }

    const categoryLabel = {
      billing: "💳 Billing",
      bug: "🐛 Bug",
      account: "👤 Account",
      csv: "📄 CSV / Export",
      metadata: "🏷️ Metadata",
      other: "💬 Other",
    }[category as string] ?? category;

    // Send internal ticket to support inbox
    await getResend().emails.send({
      from: FROM,
      to: "hello@clipmeta.app",
      replyTo: email || FROM,
      subject: `[Support] ${categoryLabel} — ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">New Support Ticket</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
            <tr><td style="padding:6px 0;color:#888;width:100px">Category</td><td><strong>${categoryLabel}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#888">From</td><td>${name ? `${name} &lt;${email}&gt;` : email}</td></tr>
            <tr><td style="padding:6px 0;color:#888">User ID</td><td><code style="font-size:12px">${userId}</code></td></tr>
            <tr><td style="padding:6px 0;color:#888">Plan</td><td>${userPlan}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Subject</td><td><strong>${subject}</strong></td></tr>
          </table>
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.6">${message}</div>
          <p style="margin-top:16px;font-size:12px;color:#888">Reply to this email to respond directly to the customer.</p>
        </div>
      `,
    });

    // Send confirmation to user
    if (email) {
      await getResend().emails.send({
        from: FROM,
        to: email,
        subject: `We received your support request — ${subject}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 8px">Got your message</h2>
            <p style="color:#666;margin:0 0 24px">We'll get back to you within 24 hours at this email address.</p>
            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:#888">Your ticket</p>
              <p style="margin:4px 0 0;font-size:15px;font-weight:600">${subject}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#555;white-space:pre-wrap">${message.slice(0, 300)}${message.length > 300 ? "…" : ""}</p>
            </div>
            <p style="font-size:13px;color:#888">— The ClipMeta Team<br><a href="https://clipmeta.app" style="color:#8b5cf6">clipmeta.app</a></p>
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
