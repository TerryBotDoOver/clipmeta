import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ADMIN_ID = "93f38fdf-4506-4dfc-89a2-28767bc0b37d";
const DRIP_SECRET = (process.env.DRIP_SECRET || "clipmeta-drip-2026").trim();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${DRIP_SECRET}`) return true;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user && user.id === ADMIN_ID);
}

function safeFilename(value: unknown) {
  const fallback = "attachment";
  if (typeof value !== "string" || !value.trim()) return fallback;
  const ascii = value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[\\/:*?"<>|\r\n]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return ascii.slice(0, 180) || fallback;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const emailId = req.nextUrl.searchParams.get("emailId")?.trim();
  const attachmentId = req.nextUrl.searchParams.get("attachmentId")?.trim();

  if (!emailId || !attachmentId || !UUID_PATTERN.test(emailId) || !UUID_PATTERN.test(attachmentId)) {
    return NextResponse.json({ message: "Valid emailId and attachmentId are required" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const attachmentResponse = await fetch(
    `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    }
  );

  if (!attachmentResponse.ok) {
    const body = await attachmentResponse.text();
    return NextResponse.json(
      { message: "Failed to retrieve attachment metadata from Resend", status: attachmentResponse.status, body },
      { status: attachmentResponse.status }
    );
  }

  const attachment = await attachmentResponse.json();
  if (!attachment?.download_url || typeof attachment.download_url !== "string") {
    return NextResponse.json({ message: "Resend did not return a download_url" }, { status: 502 });
  }

  const fileResponse = await fetch(attachment.download_url, { cache: "no-store" });
  if (!fileResponse.ok) {
    const body = await fileResponse.text();
    return NextResponse.json(
      { message: "Failed to download attachment from Resend CDN", status: fileResponse.status, body },
      { status: fileResponse.status }
    );
  }

  const contentType =
    typeof attachment.content_type === "string"
      ? attachment.content_type
      : fileResponse.headers.get("content-type") || "application/octet-stream";
  const filename = safeFilename(attachment.filename);
  const bytes = await fileResponse.arrayBuffer();

  return new NextResponse(bytes, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
