import { PLANS, type Plan } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

type BuildSupportResearchContextInput = {
  from?: unknown;
  email?: string | null;
  subject?: string;
  body?: string;
  currentEmailId?: string;
  authenticatedUserId?: string | null;
  baseAccountContext?: string;
};

type AuthUserLite = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
};

type ProjectLite = {
  id: string;
  name: string | null;
  slug: string | null;
  status: string | null;
  created_at: string | null;
};

type ClipLite = {
  id: string;
  created_at: string | null;
  project_id: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  upload_status: string | null;
  metadata_status: string | null;
  is_reviewed: boolean | null;
  storage_path: string | null;
};

const PROBLEM_WORDS =
  /\b(issue|problem|bug|error|failed|failing|broken|stuck|unable|cannot|can't|not working|playback|preview|upload|limit|quota|billing|charged|refund|regenerat|reviewed|pending)\b/i;

export function normalizeEmailAddress(value: unknown) {
  if (typeof value !== "string") return "";
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim().toLowerCase();
}

function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && value in PLANS;
}

function excerpt(value: unknown, max = 260) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text || "(empty)";
  return `${text.slice(0, max - 13).trimEnd()} ...`;
}

function formatMb(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "unknown size";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isoFromStripeSeconds(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function subscriptionPeriod(sub: unknown) {
  const subscription = sub as {
    current_period_start?: number;
    current_period_end?: number;
    items?: { data?: Array<{ current_period_start?: number; current_period_end?: number }> };
  };
  const firstItem = subscription.items?.data?.[0];
  return {
    start: isoFromStripeSeconds(firstItem?.current_period_start ?? subscription.current_period_start),
    end: isoFromStripeSeconds(firstItem?.current_period_end ?? subscription.current_period_end),
  };
}

async function findUserByEmail(email: string): Promise<AuthUserLite | null> {
  if (!email) return null;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;

    const users = (data?.users || []) as AuthUserLite[];
    const match = users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (users.length < 100) break;
  }

  return null;
}

async function findUser(input: BuildSupportResearchContextInput, email: string) {
  if (input.authenticatedUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(input.authenticatedUserId);
    if (!error && data?.user) return data.user as AuthUserLite;
  }

  return findUserByEmail(email);
}

async function countCreatedClipsSince(userId: string, sinceIso: string | null) {
  if (!sinceIso) return null;
  const { count } = await supabaseAdmin
    .from("clip_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "created")
    .gte("created_at", sinceIso);

  return count ?? 0;
}

export async function buildSupportResearchContext(input: BuildSupportResearchContextInput) {
  const email = normalizeEmailAddress(input.email || input.from);
  const subject = input.subject || "";
  const body = input.body || "";
  const problemLike = PROBLEM_WORDS.test(`${subject}\n${body}`);
  const playbackLike = /\b(playback|preview|video unavailable|couldn'?t be loaded|chrome|prores|mov|quicktime)\b/i.test(
    `${subject}\n${body}`,
  );

  const lines: string[] = [
    "Support research context:",
    problemLike
      ? "This looks like a real product/account problem. Draft a researched, specific reply; do not send a generic acknowledgement or ask for details already answered below."
      : "This looks like a lightweight reply, but still use the customer/account context below when relevant.",
  ];

  if (input.baseAccountContext?.trim()) {
    lines.push("", "Existing account context from caller:", input.baseAccountContext.trim());
  }

  if (!email) {
    lines.push("", "No normalized customer email address was available.");
    return lines.join("\n");
  }

  lines.push("", `Normalized customer email: ${email}`);

  try {
    const { data: recentEmails } = await supabaseAdmin
      .from("inbound_emails")
      .select("id, subject, body_text, status, received_at, reply_text")
      .ilike("from_address", `%${email}%`)
      .order("received_at", { ascending: false })
      .limit(5);

    if (recentEmails?.length) {
      lines.push("", "Recent inbound thread context:");
      for (const item of recentEmails) {
        const isCurrent = input.currentEmailId && item.id === input.currentEmailId ? " (current email)" : "";
        lines.push(
          `- ${item.received_at || "(unknown date)"}${isCurrent}: status=${item.status || "(none)"}, subject=${item.subject || "(no subject)"}, body="${excerpt(item.body_text)}"`,
        );
        if (item.reply_text) {
          lines.push(`  saved draft/reply excerpt="${excerpt(item.reply_text, 180)}"`);
        }
      }
    }
  } catch (error) {
    lines.push("", `Recent email lookup failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  let user: AuthUserLite | null = null;
  try {
    user = await findUser(input, email);
  } catch (error) {
    lines.push("", `Auth user lookup failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!user) {
    lines.push("", "No matching ClipMeta auth user was found for this email.");
    return lines.join("\n");
  }

  lines.push(
    "",
    "Matched ClipMeta user:",
    `- user_id: ${user.id}`,
    `- auth email: ${user.email || "(unknown)"}`,
    `- created_at: ${user.created_at || "(unknown)"}`,
    `- confirmed_at: ${user.confirmed_at || "(unknown)"}`,
    `- last_sign_in_at: ${user.last_sign_in_at || "(unknown)"}`,
  );

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "plan, billing_period_start, bonus_clips, rollover_clips, credits, regens_used_this_month, stripe_subscription_id, stripe_subscription_status, referral_pro_forever, referral_pro_until",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    lines.push("", "No profile row found for matched user.");
    return lines.join("\n");
  }

  const basePlan = isPlan(profile.plan) ? profile.plan : "free";
  let effectivePlan: Plan = basePlan;
  if (profile.referral_pro_forever) {
    effectivePlan = "pro";
  } else if (profile.referral_pro_until && new Date(profile.referral_pro_until) > new Date()) {
    effectivePlan = "pro";
  }

  const planConfig = PLANS[effectivePlan];
  const bonusClips = Number(profile.bonus_clips || 0);
  const rolloverClips = Number(profile.rollover_clips || 0);
  const effectiveClipLimit =
    planConfig.period === "monthly" ? planConfig.clips + bonusClips + rolloverClips : planConfig.clips;

  let stripePeriodStart: string | null = null;
  let stripePeriodEnd: string | null = null;
  if (profile.stripe_subscription_id) {
    try {
      const sub = await getStripe().subscriptions.retrieve(profile.stripe_subscription_id);
      const period = subscriptionPeriod(sub);
      stripePeriodStart = period.start;
      stripePeriodEnd = period.end;
    } catch (error) {
      lines.push("", `Stripe subscription lookup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const profileBillingStart = profile.billing_period_start
    ? new Date(profile.billing_period_start).toISOString()
    : null;
  const usedSinceProfileStart = await countCreatedClipsSince(user.id, profileBillingStart);
  const usedSinceStripeStart =
    stripePeriodStart && stripePeriodStart !== profileBillingStart
      ? await countCreatedClipsSince(user.id, stripePeriodStart)
      : usedSinceProfileStart;
  const { count: lifetimeClips } = await supabaseAdmin
    .from("clip_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("action", "created");

  lines.push(
    "",
    "Account usage:",
    `- plan: ${planConfig.name} (stored=${profile.plan || "(none)"}, effective=${effectivePlan})`,
    `- stored subscription status: ${profile.stripe_subscription_status || "(none)"}`,
    `- profile billing_period_start: ${profileBillingStart || "(none)"}`,
    `- Stripe item period: ${stripePeriodStart || "(not available)"} to ${stripePeriodEnd || "(not available)"}`,
    `- clip limit this period: ${effectiveClipLimit} (${planConfig.clips} base + ${bonusClips} bonus + ${rolloverClips} rollover)`,
    `- clips used since profile start: ${usedSinceProfileStart ?? "(unknown)"}`,
    `- clips used since Stripe item start: ${usedSinceStripeStart ?? "(unknown)"}`,
    `- remaining by best-known period: ${
      usedSinceStripeStart === null ? "(unknown)" : Math.max(0, effectiveClipLimit - usedSinceStripeStart)
    }`,
    `- credits: ${Number(profile.credits || 0)}`,
    `- regenerations used: ${Number(profile.regens_used_this_month || 0)} of ${planConfig.regens}`,
    `- lifetime uploaded clips: ${lifetimeClips ?? "(unknown)"}`,
  );

  if (profileBillingStart && stripePeriodStart && profileBillingStart !== stripePeriodStart) {
    lines.push(
      "- internal note: profile billing_period_start differs from Stripe. Prefer Stripe item period for usage/reply wording.",
    );
  }

  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id, name, slug, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const projectRows = (projects || []) as ProjectLite[];
  if (projectRows.length) {
    lines.push("", "Recent projects:");
    for (const project of projectRows) {
      lines.push(
        `- ${project.created_at || "(unknown date)"}: ${project.name || "(untitled)"} (${project.slug || project.id}), status=${project.status || "(none)"}`,
      );
    }
  }

  const projectIds = projectRows.map((project) => project.id);
  if (projectIds.length) {
    const { data: clips } = await supabaseAdmin
      .from("clips")
      .select("id, created_at, project_id, original_filename, file_size_bytes, upload_status, metadata_status, is_reviewed, storage_path")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(8);

    const clipRows = (clips || []) as ClipLite[];
    if (clipRows.length) {
      const projectById = new Map(projectRows.map((project) => [project.id, project]));
      lines.push("", "Recent clips:");
      for (const clip of clipRows) {
        const project = clip.project_id ? projectById.get(clip.project_id) : null;
        lines.push(
          `- ${clip.created_at || "(unknown date)"}: ${clip.original_filename || "(unnamed)"} in ${project?.name || clip.project_id || "(unknown project)"}, ${formatMb(clip.file_size_bytes)}, upload=${clip.upload_status || "(none)"}, metadata=${clip.metadata_status || "(none)"}, reviewed=${clip.is_reviewed === true ? "yes" : "no"}`,
        );
      }

      const hasLikelyBrowserCodecIssue = clipRows.some((clip) => {
        const filename = (clip.original_filename || clip.storage_path || "").toLowerCase();
        return /\.(mov|mxf|mts|m2ts)$/.test(filename);
      });

      if (playbackLike && hasLikelyBrowserCodecIssue) {
        lines.push(
          "",
          "Potential playback diagnosis:",
          "- Recent uploads include MOV/MXF-style files. Browser preview depends on whether the browser can decode the actual codec, not just whether the file uploaded.",
          "- If the file is Apple ProRes 422/HQ and the customer is using Chrome, the ClipMeta browser preview can fail even when the source file is present and metadata/export still work.",
          "- Ask what browser they are using, mention Chrome + Apple ProRes 422 HQ as a likely preview limitation, and offer a concrete workaround: continue using the metadata/export/FTP output, or upload an H.264/MP4 preview-friendly version when in-browser preview is important.",
        );
      }
    }
  }

  return lines.join("\n");
}
