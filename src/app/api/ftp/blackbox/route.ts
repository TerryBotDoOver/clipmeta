import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getR2ReadUrl } from "@/lib/r2";
import { Readable } from "stream";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ftp = require("basic-ftp") as typeof import("basic-ftp");

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { project_id, blackbox_email, blackbox_password, clip_ids } = body;

    if (!project_id || !blackbox_email || !blackbox_password) {
      return NextResponse.json({ error: "project_id, blackbox_email, and blackbox_password are required." }, { status: 400 });
    }

    // Verify project belongs to user
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, name")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Fetch clips
    let query = supabaseAdmin
      .from("clips")
      .select("id, original_filename, storage_path")
      .eq("project_id", project_id)
      .eq("metadata_status", "complete");

    if (clip_ids && Array.isArray(clip_ids) && clip_ids.length > 0) {
      query = query.in("id", clip_ids);
    }

    const { data: clips } = await query;

    if (!clips || clips.length === 0) {
      return NextResponse.json({ error: "No clips with completed metadata found." }, { status: 400 });
    }

    // Connect to Blackbox FTP
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: "portal.blackbox.global",
        user: blackbox_email.trim().toLowerCase(),
        password: blackbox_password,
        secure: false,
        port: 21,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        error: `FTP login failed: ${msg}. Check your Blackbox email and password.`,
      }, { status: 401 });
    }

    // Blackbox's ingest worker watches the `stock_footage` folder inside each
    // user's FTP home directory. Files uploaded elsewhere land in limbo and
    // never appear in the Workspace. ensureDir CDs into stock_footage, creating
    // it first if the account doesn't have it yet (new accounts sometimes don't).
    let uploadDir = "stock_footage";
    try {
      await client.ensureDir("stock_footage");
      uploadDir = await client.pwd();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      client.close();
      return NextResponse.json({
        error: `Could not access the stock_footage folder on your Blackbox FTP: ${msg}. ` +
               `If you're a new Blackbox contributor, your account may not be fully approved yet.`,
      }, { status: 502 });
    }

    // Transfer each clip
    const results: { filename: string; status: "ok" | "error"; error?: string }[] = [];
    let succeeded = 0;
    let failed = 0;

    try {
      for (const clip of clips) {
        if (!clip.storage_path) {
          results.push({ filename: clip.original_filename, status: "error", error: "No storage path" });
          failed++;
          continue;
        }

        try {
          const r2Url = await getR2ReadUrl(clip.storage_path, 3600);
          const res = await fetch(r2Url);
          if (!res.ok || !res.body) throw new Error(`R2 fetch failed: ${res.status}`);

          const nodeStream = Readable.fromWeb(res.body as import("stream/web").ReadableStream);
          await client.uploadFrom(nodeStream, clip.original_filename);

          results.push({ filename: clip.original_filename, status: "ok" });
          succeeded++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ filename: clip.original_filename, status: "error", error: msg });
          failed++;
        }
      }
    } finally {
      client.close();
    }

    return NextResponse.json({ ok: true, results, succeeded, failed, total: clips.length, upload_dir: uploadDir });

  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Unexpected error",
    }, { status: 500 });
  }
}
