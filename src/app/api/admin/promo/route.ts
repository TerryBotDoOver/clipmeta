import { getStripe } from '@/lib/stripe';

const DRIP_SECRET = (process.env.DRIP_SECRET || 'clipmeta-drip-2026').trim();

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${DRIP_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { code, percentOff, durationMonths, maxRedemptions } = await req.json();

    if (!code || !percentOff) {
      return Response.json({ error: 'code and percentOff are required' }, { status: 400 });
    }

    const stripe = getStripe();

    // Create coupon
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: durationMonths ? 'repeating' : 'once',
      duration_in_months: durationMonths || undefined,
      max_redemptions: maxRedemptions || undefined,
    });

    // Create promotion code with the human-readable code
    // The clover API version uses promotion.coupon as a polymorphic field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promoCode = await (stripe.promotionCodes.create as any)({
      promotion: {
        type: 'coupon',
        coupon: coupon.id,
      },
      code: code,
      max_redemptions: maxRedemptions || undefined,
    });

    return Response.json({ couponId: coupon.id, promoCodeId: promoCode.id, code });
  } catch (err: unknown) {
    console.error('[promo] Error creating promo code:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${DRIP_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const promoCodes = await stripe.promotionCodes.list({ limit: 20, active: true });

    return Response.json({
      codes: promoCodes.data.map((p) => ({
        id: p.id,
        code: p.code,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        percentOff: (p as any).coupon?.percent_off ?? (p as any).promotion?.coupon?.percent_off ?? null,
        timesRedeemed: p.times_redeemed,
      })),
    });
  } catch (err: unknown) {
    console.error('[promo] Error listing promo codes:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
