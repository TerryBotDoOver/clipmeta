import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Client calls this fire-and-forget when an upload exhausts the retry loop.
// Purpose: give us visibility into upload failures across all users so we can
// distinguish between one person's flaky WiFi and a real site-wide outage.
// This endpoint is deliberately tolerant -- any error here is logged and
// swallowed so we never surface an error to a user who's already having an
// upload error.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const {
      project_id,
      filename,
      file_size_bytes,
      file_type,
      upload_method,      // 'single-put' | 'multipart'
      error_message,
      attempts_tried,
      failed_at_part,     // number | null
    } = body;

    const user_agent = req.headers.get("user-agent") || null;

    const { error } = await supabaseAdmin
      .from("upload_failures")
      .insert({
        user_id: user?.id ?? null,
        project_id: project_id ?? null,
        filename: typeof filename === "string" ? filename.slice(0, 500) : null,
        file_size_bytes: typeof file_size_bytes === "number" ? file_size_bytes : null,
        file_type: typeof file_type === "string" ? file_type.slice(0, 100) : null,
        upload_method: typeof upload_method === "string" ? upload_method.slice(0, 32) : null,
        error_message: typeof error_message === "string" ? error_message.slice(0, 1000) : null,
        attempts_tried: typeof attempts_tried === "number" ? attempts_tried : null,
        failed_at_part: typeof failed_at_part === "number" ? failed_at_part : null,
        user_agent: user_agent ? user_agent.slice(0, 500) : null,
      });

    if (error) {
      // Log server-side but still return 200 -- we never want the logger itself
      // to produce a user-facing error.
      console.error("[upload-failure] insert failed:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[upload-failure] unexpected:", err);
    // Always 200 -- this is pure telemetry, not user-critical.
    return NextResponse.json({ ok: true });
  }
}
