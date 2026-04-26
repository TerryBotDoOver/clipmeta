import { NextRequest, NextResponse } from "next/server";
import { DISCORD_CHANNELS, sendDiscordMessage } from "@/lib/discord";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 60;

type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

const NOTIFICATION_KEY = "discord_signup_notified";
const DEFAULT_START_AT = "2026-04-26T22:55:00.000Z";

function authOk(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

function providerFor(user: AuthUser) {
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.length > 0) return providers.join(", ");
  const provider = user.app_metadata?.provider;
  return typeof provider === "string" ? provider : "email";
}

async function handle(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const startAt = Date.parse(process.env.SIGNUP_NOTIFICATIONS_START_AT || DEFAULT_START_AT);

  const users = ((data.users || []) as AuthUser[])
    .filter((user) => user.id && user.email)
    .filter((user) => Date.parse(user.created_at || "") >= startAt)
    .sort((a, b) => Date.parse(a.created_at || "") - Date.parse(b.created_at || ""));

  const notified: string[] = [];
  const skipped: string[] = [];

  for (const user of users) {
    const { data: existing } = await supabaseAdmin
      .from("drip_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("email_key", NOTIFICATION_KEY)
      .maybeSingle();

    if (existing) {
      skipped.push(user.id);
      continue;
    }

    const name = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

    const content = [
      "**New ClipMeta signup**",
      `Email: ${user.email}`,
      name ? `Name: ${name}` : null,
      `Provider: ${providerFor(user)}`,
      `Created: ${user.created_at || new Date().toISOString()}`,
      `User ID: ${user.id}`,
    ].filter(Boolean).join("\n");

    const discord = await sendDiscordMessage({
      channelId: DISCORD_CHANNELS.signups,
      content,
    });

    if (discord.ok || discord.skipped) {
      await supabaseAdmin.from("drip_log").insert({
        user_id: user.id,
        email_key: NOTIFICATION_KEY,
      });
      notified.push(user.id);
    }
  }

  return NextResponse.json({
    checked: users.length,
    notified: notified.length,
    skipped: skipped.length,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
