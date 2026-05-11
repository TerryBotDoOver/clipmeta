import Link from "next/link";
import { Metadata } from "next";
import EmailCapture from "@/components/EmailCapture";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";

const pageUrl = "https://clipmeta.app/lp/blackbox-upload";

export const metadata: Metadata = {
  title: "Upload to Blackbox Faster — ClipMeta",
  description:
    "ClipMeta generates titles, descriptions, keywords, categories, and location for your stock clips — then exports a CSV that maps directly to Blackbox.global's upload template.",
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "Upload to Blackbox Faster - ClipMeta",
    description:
      "ClipMeta generates titles, descriptions, keywords, categories, and location for your stock clips, then exports a CSV for Blackbox.global.",
    url: pageUrl,
    siteName: "ClipMeta",
    type: "website",
    images: [
      {
        url: "https://clipmeta.app/logo-full.png",
        width: 1200,
        height: 630,
        alt: "ClipMeta Blackbox upload",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Upload to Blackbox Faster - ClipMeta",
    description:
      "ClipMeta generates titles, descriptions, keywords, categories, and location for your stock clips, then exports a CSV for Blackbox.global.",
    images: ["https://clipmeta.app/logo-full.png"],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Upload to Blackbox Faster",
      url: pageUrl,
      description:
        "Generate Blackbox.global metadata and export a CSV that fits stock footage contributor upload workflows.",
      isPartOf: {
        "@type": "WebSite",
        name: "ClipMeta",
        url: "https://clipmeta.app",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "ClipMeta",
          item: "https://clipmeta.app",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blackbox Upload",
          item: pageUrl,
        },
      ],
    },
  ],
};

export default function BlackboxUploadPage() {
  return (
    <FlightDeckShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="hud-chip mx-auto mb-4 inline-flex">
          Blackbox.global metadata upload
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-white md:text-6xl">
          Upload to Blackbox.global Faster With <span className="gradient-text">AI Metadata</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
          ClipMeta generates your titles, descriptions, keywords, categories, and location —
          then exports a CSV that maps directly to Blackbox.global&apos;s upload template.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth"
            className="rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/5"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Pain vs Solution */}
      <section className="relative border-t border-white/10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white">
            Blackbox submissions shouldn&apos;t slow you down
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-8">
              <h3 className="mb-4 text-lg font-semibold text-red-200">Doing it manually</h3>
              <ul className="space-y-3 text-sm leading-6 text-red-100/80">
                <li className="flex items-start gap-2"><span>✗</span> Building the spreadsheet from scratch every batch</li>
                <li className="flex items-start gap-2"><span>✗</span> Getting column names wrong and re-uploading</li>
                <li className="flex items-start gap-2"><span>✗</span> Writing titles, keywords, and categories by hand</li>
                <li className="flex items-start gap-2"><span>✗</span> Missing fields like location or category</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-green-400/30 bg-green-500/10 p-8">
              <h3 className="mb-4 text-lg font-semibold text-green-200">With ClipMeta</h3>
              <ul className="space-y-3 text-sm leading-6 text-green-100/80">
                <li className="flex items-start gap-2"><span>✓</span> AI fills every required Blackbox metadata field</li>
                <li className="flex items-start gap-2"><span>✓</span> CSV columns match the Blackbox upload template</li>
                <li className="flex items-start gap-2"><span>✓</span> Title, description, keywords, category, location — all covered</li>
                <li className="flex items-start gap-2"><span>✓</span> Review and edit before you export</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="glass-card p-8 text-center">
              <div className="text-4xl">📤</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60">Step 1</div>
              <h3 className="mt-2 text-lg font-semibold text-white">Upload clips</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Create a project in ClipMeta and upload your footage.
                ClipMeta extracts frames and prepares each clip for analysis.
              </p>
            </div>
            <div className="glass-card p-8 text-center">
              <div className="text-4xl">🤖</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60">Step 2</div>
              <h3 className="mt-2 text-lg font-semibold text-white">AI generates metadata</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                ClipMeta automatically generates titles, descriptions, keywords,
                categories, and location for every clip — Blackbox-ready.
              </p>
            </div>
            <div className="glass-card p-8 text-center">
              <div className="text-4xl">📋</div>
              <div className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60">Step 3</div>
              <h3 className="mt-2 text-lg font-semibold text-white">Export Blackbox CSV</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Review everything inline, then export a CSV mapped directly to
                Blackbox.global&apos;s upload template. Upload and you&apos;re done.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EmailCapture source="seo-blackbox" />

      {/* CTA */}
      <section className="relative border-t border-white/10 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Ready to submit to Blackbox faster?
          </h2>
          <p className="mt-4 text-lg text-white/65">
            Free plan available. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white">
            Frequently asked questions
          </h2>
          <div className="space-y-8">
            <div className="border-b border-white/10 pb-8">
              <h3 className="text-base font-semibold text-white">Does the CSV export match the Blackbox.global format?</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Yes. The exported CSV is mapped to match Blackbox.global&apos;s upload template columns,
                so you can import it directly without reformatting.
              </p>
            </div>
            <div className="border-b border-white/10 pb-8">
              <h3 className="text-base font-semibold text-white">Can I also export for other platforms?</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Yes. ClipMeta also supports CSV exports for Pond5, Adobe Stock, and Shutterstock
                from the same project.
              </p>
            </div>
            <div className="border-b border-white/10 pb-8">
              <h3 className="text-base font-semibold text-white">Do I need a Blackbox.global account to use ClipMeta?</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                No. ClipMeta is an independent tool. You use it to prepare your metadata,
                then upload to Blackbox separately using their standard process.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">How fast is the metadata generation?</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Under a minute per clip in most cases. You can submit a batch and review
                results as they come in.
              </p>
            </div>
          </div>
        </div>
      </section>

    </FlightDeckShell>
  );
}
