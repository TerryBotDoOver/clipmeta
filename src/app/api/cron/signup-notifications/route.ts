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

type SignupProfile = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  utm_referrer?: string | null;
  utm_landing_path?: string | null;
  utm_captured_at?: string | null;
  referred_by?: string | null;
  referral_qualified?: boolean | null;
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

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function nameFor(user: AuthUser) {
  return stringValue(user.user_metadata?.full_name)
    || stringValue(user.user_metadata?.name)
    || stringValue(user.user_metadata?.display_name);
}

function hostFromUrl(value?: string | null) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }
}

function landingQueryValue(profile: SignupProfile | null, key: string) {
  const landingPath = profile?.utm_landing_path;
  if (!landingPath) return "";
  try {
    const url = new URL(landingPath, "https://clipmeta.app");
    return url.searchParams.get(key) || "";
  } catch {
    return "";
  }
}

function clickIdLabels(profile: SignupProfile | null) {
  const labels: string[] = [];
  const landingPath = profile?.utm_landing_path || "";
  const content = profile?.utm_content || "";
  if (landingPath.includes("gclid=") || content.includes("gclid")) labels.push("Google Ads click ID");
  if (landingPath.includes("fbclid=") || content.includes("fbclid")) labels.push("Meta/Facebook click ID");
  if (landingPath.includes("msclkid=") || content.includes("msclkid")) labels.push("Microsoft/Bing click ID");
  if (landingPath.includes("rdt_cid=") || content.includes("rdt_cid")) labels.push("Reddit click ID");
  return labels;
}

function likelySource(profile: SignupProfile | null) {
  if (!profile) return "Unknown, no profile row found yet";

  const source = (profile.utm_source || "").toLowerCase();
  const medium = (profile.utm_medium || "").toLowerCase();
  const referrerHost = hostFromUrl(profile.utm_referrer).toLowerCase();
  const landingPath = (profile.utm_landing_path || "").toLowerCase();

  if (profile.referred_by) return `Referral link (${profile.referred_by})`;
  if (landingPath.includes("gclid=")) return "Google Ads";
  if (landingPath.includes("fbclid=")) return "Meta/Facebook";
  if (landingPath.includes("msclkid=")) return "Microsoft/Bing Ads";
  if (landingPath.includes("rdt_cid=")) return "Reddit Ads";
  if (source.includes("chatgpt") || source.includes("openai") || referrerHost.includes("chatgpt") || referrerHost.includes("openai")) return "ChatGPT/OpenAI";
  if (source.includes("facebook") || source.includes("meta") || referrerHost.includes("facebook.com") || referrerHost.includes("instagram.com")) return "Meta/Facebook";
  if (source.includes("reddit") || referrerHost.includes("reddit.com")) return "Reddit";
  if (source.includes("google") && (medium.includes("cpc") || medium.includes("paid") || medium.includes("ads"))) return "Google Ads";
  if (referrerHost.includes("google.")) return "Google organic/search";
  if (referrerHost.includes("bing.")) return "Bing organic/search";
  if (source) return profile.utm_source || "Unknown";
  if (referrerHost) return `Referral traffic from ${referrerHost}`;
  return "Direct or not captured";
}

function formatAttribution(profile: SignupProfile | null) {
  const lines: Array<string | null> = [
    "**Acquisition**",
    `Likely source: ${likelySource(profile)}`,
  ];

  if (!profile) {
    lines.push("Attribution detail: no profile row found when cron ran");
    return lines;
  }

  const refCode = profile.referred_by || landingQueryValue(profile, "ref");
  if (refCode) {
    lines.push(`Referral: ${refCode}${profile.referral_qualified ? " (qualified)" : " (pending)"}`);
  }

  const utmParts = [
    profile.utm_source ? `source=${profile.utm_source}` : null,
    profile.utm_medium ? `medium=${profile.utm_medium}` : null,
    profile.utm_campaign ? `campaign=${profile.utm_campaign}` : null,
    profile.utm_content ? `content=${profile.utm_content}` : null,
    profile.utm_term ? `term=${profile.utm_term}` : null,
  ].filter(Boolean);
  if (utmParts.length > 0) lines.push(`UTM: ${utmParts.join(" | ")}`);

  const clickIds = clickIdLabels(profile);
  if (clickIds.length > 0) lines.push(`Click IDs: ${clickIds.join(", ")}`);

  const referrerHost = hostFromUrl(profile.utm_referrer);
  if (referrerHost) lines.push(`Referrer: ${referrerHost}`);
  if (profile.utm_landing_path) lines.push(`Landing: ${profile.utm_landing_path}`);
  if (profile.utm_captured_at) lines.push(`Captured: ${profile.utm_captured_at}`);

  if (lines.length === 2) {
    lines.push("Attribution detail: none captured, likely direct, blocked referrer, or not synced before cron ran");
  }

  return lines;
}

async function loadSignupProfile(userId: string): Promise<SignupProfile | null> {
  const fullSelect = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_referrer",
    "utm_landing_path",
    "utm_captured_at",
    "referred_by",
    "referral_qualified",
  ].join(", ");

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(fullSelect)
    .eq("id", userId)
    .maybeSingle();

  if (!error) return data as SignupProfile | null;

  console.warn("[signup-notifications] Full attribution profile lookup failed", error.message);

  const { data: fallback, error: fallbackError } = await supabaseAdmin
    .from("profiles")
    .select("utm_source, utm_medium, utm_campaign, utm_referrer")
    .eq("id", userId)
    .maybeSingle();

  if (fallbackError) {
    console.warn("[signup-notifications] Fallback profile lookup failed", fallbackError.message);
    return null;
  }

  return fallback as SignupProfile | null;
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

    const profile = await loadSignupProfile(user.id);
    const name = nameFor(user);

    const content = [
      "**New ClipMeta signup**",
      `Email: ${user.email}`,
      name ? `Name: ${name}` : null,
      `Provider: ${providerFor(user)}`,
      `Created: ${user.created_at || new Date().toISOString()}`,
      `User ID: ${user.id}`,
      "",
      ...formatAttribution(profile),
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
