import crypto from "crypto";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

type TrialClaimMatchReason =
  | "email"
  | "stripe_customer"
  | "payment_fingerprint";

type TrialClaimMatch = {
  reason: TrialClaimMatchReason;
  claimId: string;
};

type TrialEligibilityInput = {
  email: string | null | undefined;
  stripeCustomerId?: string | null;
};

type RecordTrialClaimInput = TrialEligibilityInput & {
  userId: string;
  stripeSubscriptionId?: string | null;
  paymentFingerprint?: string | null;
  ipHash?: string | null;
  ipAddress?: string | null;
  plan?: string | null;
  source: string;
  metadata?: Record<string, unknown>;
};

export function normalizeTrialEmail(email: string | null | undefined) {
  const trimmed = (email ?? "").trim().toLowerCase();
  const [rawLocal, rawDomain] = trimmed.split("@");
  if (!rawLocal || !rawDomain) return trimmed;

  let local = rawLocal;
  let domain = rawDomain;

  const plusIndex = local.indexOf("+");
  if (plusIndex >= 0) local = local.slice(0, plusIndex);

  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");

  return `${local}@${domain}`;
}

export function getClientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    null
  );
}

function trialHash(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  const salt =
    process.env.TRIAL_CLAIM_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "clipmeta-trial-claim-dev";

  return crypto
    .createHmac("sha256", salt)
    .update(normalized)
    .digest("hex");
}

export function trialEmailHash(email: string | null | undefined) {
  return trialHash(normalizeTrialEmail(email));
}

export function trialIpHash(ipAddress: string | null | undefined) {
  return trialHash(ipAddress);
}

export function trialPaymentFingerprintHash(paymentFingerprint: string | null | undefined) {
  return trialHash(paymentFingerprint);
}

export async function findTrialClaimMatches(input: TrialEligibilityInput & {
  paymentFingerprint?: string | null;
}) {
  const matches: TrialClaimMatch[] = [];
  const emailHash = trialEmailHash(input.email);
  const paymentFingerprintHash = trialPaymentFingerprintHash(input.paymentFingerprint);

  if (emailHash) {
    const { data } = await supabaseAdmin
      .from("trial_claims")
      .select("id")
      .eq("email_hash", emailHash)
      .maybeSingle();
    if (data?.id) matches.push({ reason: "email", claimId: data.id });
  }

  if (input.stripeCustomerId) {
    const { data } = await supabaseAdmin
      .from("trial_claims")
      .select("id")
      .eq("stripe_customer_id", input.stripeCustomerId)
      .maybeSingle();
    if (data?.id) matches.push({ reason: "stripe_customer", claimId: data.id });
  }

  if (paymentFingerprintHash) {
    const { data } = await supabaseAdmin
      .from("trial_claims")
      .select("id")
      .eq("payment_fingerprint_hash", paymentFingerprintHash)
      .maybeSingle();
    if (data?.id) matches.push({ reason: "payment_fingerprint", claimId: data.id });
  }

  return matches;
}

export async function findDuplicatePaymentTrialClaim(
  paymentFingerprint: string | null | undefined,
  currentUserId: string,
  currentSubscriptionId?: string | null
) {
  const paymentFingerprintHash = trialPaymentFingerprintHash(paymentFingerprint);
  if (!paymentFingerprintHash) return null;

  const { data } = await supabaseAdmin
    .from("trial_claims")
    .select("id, latest_user_id, stripe_subscription_id")
    .eq("payment_fingerprint_hash", paymentFingerprintHash)
    .maybeSingle();

  if (!data?.id) return null;
  if (data.latest_user_id === currentUserId) return null;
  if (currentSubscriptionId && data.stripe_subscription_id === currentSubscriptionId) return null;
  return data;
}

export async function recordTrialClaim(input: RecordTrialClaimInput) {
  const emailHash = trialEmailHash(input.email);
  if (!emailHash) return null;

  const paymentFingerprintHash = trialPaymentFingerprintHash(input.paymentFingerprint);
  const ipHash = input.ipHash ?? trialIpHash(input.ipAddress);
  const now = new Date().toISOString();

  const existingMatches = await findTrialClaimMatches({
    email: input.email,
    stripeCustomerId: input.stripeCustomerId,
    paymentFingerprint: input.paymentFingerprint,
  });

  const existingId = existingMatches[0]?.claimId;
  const payload: Record<string, unknown> = {
    latest_user_id: input.userId,
    source: input.source,
    last_seen_at: now,
    metadata: input.metadata ?? {},
  };
  if (input.stripeCustomerId) payload.stripe_customer_id = input.stripeCustomerId;
  if (input.stripeSubscriptionId) payload.stripe_subscription_id = input.stripeSubscriptionId;
  if (paymentFingerprintHash) payload.payment_fingerprint_hash = paymentFingerprintHash;
  if (ipHash) payload.ip_hash = ipHash;
  if (input.plan) payload.plan = input.plan;

  if (existingId) {
    const { data, error } = await supabaseAdmin
      .from("trial_claims")
      .update(payload)
      .eq("id", existingId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("trial_claims")
    .insert({
      ...payload,
      first_user_id: input.userId,
      email_hash: emailHash,
      first_claimed_at: now,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSubscriptionPaymentFingerprint(sub: Stripe.Subscription | null) {
  if (!sub) return null;

  const defaultPaymentMethod = sub.default_payment_method;
  if (defaultPaymentMethod && typeof defaultPaymentMethod !== "string") {
    return defaultPaymentMethod.card?.fingerprint ?? null;
  }

  if (typeof defaultPaymentMethod === "string") {
    const paymentMethod = await getStripe().paymentMethods.retrieve(defaultPaymentMethod);
    return paymentMethod.card?.fingerprint ?? null;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;

  const paymentMethods = await getStripe().paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });

  return paymentMethods.data[0]?.card?.fingerprint ?? null;
}
