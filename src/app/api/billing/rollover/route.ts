import { NextResponse } from "next/server";

/**
 * GET /api/billing/rollover
 *
 * DEPRECATED 2026-04-15.
 *
 * The nightly rollover cron was removed because its logic had two bugs:
 *   1. It counted clips from the `clips` table, which undercounts users who
 *      delete clips after export. That inflated everyone's "unused" tally.
 *   2. It ran every night instead of once per billing cycle, so the inflated
 *      bonus accumulated daily until it hit the plan's rolloverCap.
 *
 * Rollover is now handled inline in the Stripe webhook (`invoice.paid` with
 * `billing_reason === 'subscription_cycle'`) using `clip_history.created`
 * as the authoritative count. It fires exactly once per renewal.
 *
 * This endpoint is kept only so any stale cron call returns a clean 410
 * instead of a 404 or silent success.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Gone",
      message: "Rollover is now handled by the Stripe invoice.paid webhook. This endpoint is no longer used.",
    },
    { status: 410 }
  );
}
