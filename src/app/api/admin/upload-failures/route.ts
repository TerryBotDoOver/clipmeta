import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const DRIP_SECRET = (process.env.DRIP_SECRET || "clipmeta-drip-2026").trim();
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET?.trim();

type UploadFailureRow = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  filename: string | null;
  file_size_bytes: number | null;
  file_type: string | null;
  upload_method: string | null;
  error_message: string | null;
  attempts_tried: number | null;
  failed_at_part: number | null;
  user_agent: string | null;
  created_at: string;
};

function isAuthorized(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")?.trim();
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const validTokens = [SERVICE_ROLE_KEY, DRIP_SECRET, ADMIN_API_SECRET].filter(Boolean);
  return validTokens.some((token) => adminKey === token || bearer === token);
}

async function findUserIdByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;

    const match = (data?.users || []).find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if ((data?.users || []).length < 100) break;
  }

  return null;
}

function increment(map: Record<string, number>, key: string | null | undefined) {
  const normalized = key?.trim() || "(none)";
  map[normalized] = (map[normalized] || 0) + 1;
}

function fileSizeBucket(bytes: number | null) {
  if (!bytes || bytes <= 0) return "unknown";
  const mb = bytes / 1024 / 1024;
  if (mb < 50) return "<50MB";
  if (mb < 250) return "50-250MB";
  if (mb < 1000) return "250MB-1GB";
  return "1GB+";
}

function summarize(rows: UploadFailureRow[]) {
  const byMethod: Record<string, number> = {};
  const byError: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  const bySize: Record<string, number> = {};
  const byPart: Record<string, number> = {};

  for (const row of rows) {
    increment(byMethod, row.upload_method);
    increment(byError, row.error_message);
    increment(byUser, row.user_id);
    increment(bySize, fileSizeBucket(row.file_size_bytes));
    increment(byPart, row.failed_at_part === null ? "(single-put)" : `part-${row.failed_at_part}`);
  }

  return {
    total: rows.length,
    byMethod,
    byError,
    byUser,
    bySize,
    byPart,
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const hours = Math.min(Math.max(Number(url.searchParams.get("hours") || 72), 1), 720);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 500);
  const email = url.searchParams.get("email") || "";
  const requestedUserId = url.searchParams.get("userId") || "";
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  try {
    const resolvedUserId = requestedUserId || (email ? await findUserIdByEmail(email) : "");

    let query = supabaseAdmin
      .from("upload_failures")
      .select(
        "id, user_id, project_id, filename, file_size_bytes, file_type, upload_method, error_message, attempts_tried, failed_at_part, user_agent, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (resolvedUserId) {
      query = query.eq("user_id", resolvedUserId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const failures = (data || []) as UploadFailureRow[];

    return NextResponse.json({
      filter: {
        email: email || null,
        requestedUserId: requestedUserId || null,
        resolvedUserId: resolvedUserId || null,
        hours,
        since,
        limit,
      },
      summary: summarize(failures),
      failures,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
