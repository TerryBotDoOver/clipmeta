import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Free, Starter, Pro & Studio Plans",
  description:
    "ClipMeta pricing: Free (3 clips/day, no credit card), Starter ($9/mo, 140 clips), Pro ($19/mo, 320 clips), Studio ($49/mo, 2000 clips). All paid plans include a 7-day free trial.",
  alternates: { canonical: "https://clipmeta.app/pricing" },
  openGraph: {
    title: "ClipMeta Pricing - Plans for Every Stock Contributor",
    description:
      "Start free with 3 clips/day. Upgrade for 140 to 2000 clips/month with AI metadata, platform CSV exports, and clip rollover. 7-day free trial on all paid plans.",
    url: "https://clipmeta.app/pricing",
    type: "website",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
