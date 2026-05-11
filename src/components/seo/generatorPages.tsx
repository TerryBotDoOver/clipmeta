import Link from "next/link";
import type { Metadata } from "next";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";

const BASE_URL = "https://clipmeta.app";

type Faq = {
  question: string;
  answer: string;
};

type GeneratorPage = {
  slug: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  metadataTitle: string;
  metadataDescription: string;
  platform: string;
  audience: string;
  primaryIntent: string;
  ctaSource: string;
  exampleTitle: string;
  exampleDescription: string;
  exampleKeywords: string[];
  workflow: string[];
  benefits: string[];
  platformNotes: string[];
  faqs: Faq[];
};

export const GENERATOR_PAGES = {
  "stock-video-keyword-generator": {
    slug: "stock-video-keyword-generator",
    eyebrow: "AI stock video keyword generator",
    title: "Stock Video Keyword Generator",
    accent: "built for footage contributors",
    description:
      "Generate stock-ready titles, descriptions, and keyword sets from your video frames. ClipMeta helps you move from raw footage to reviewed metadata and CSV export without starting from a blank spreadsheet.",
    metadataTitle: "Stock Video Keyword Generator | AI Keywords for Footage",
    metadataDescription:
      "Generate stock video titles, descriptions, and keywords from your footage. Built for contributors uploading to Blackbox, Pond5, Adobe Stock, and Shutterstock.",
    platform: "stock footage marketplaces",
    audience: "stock footage contributors",
    primaryIntent: "turn a batch of clips into searchable metadata",
    ctaSource: "seo-stock-video-keyword-generator",
    exampleTitle: "Aerial view of kayakers crossing a calm Florida river at sunrise",
    exampleDescription:
      "Drone footage of two kayakers paddling across still water in early morning light, with wetlands and tree-lined shoreline visible from above.",
    exampleKeywords: [
      "aerial",
      "drone",
      "kayaking",
      "river",
      "sunrise",
      "Florida",
      "wetlands",
      "outdoor recreation",
      "calm water",
      "nature",
      "travel",
      "adventure",
    ],
    workflow: [
      "Upload clips into a ClipMeta project.",
      "ClipMeta reads frames from the video, not just the filename.",
      "Review titles, descriptions, and keyword lists before export.",
      "Download a CSV for the marketplace workflow you use.",
    ],
    benefits: [
      "Avoid generic keyword stuffing.",
      "Keep keyword language consistent across large shoots.",
      "Review every result before using it.",
      "Export platform-ready CSVs instead of rebuilding spreadsheets.",
    ],
    platformNotes: [
      "Use concrete visual details: subject, action, setting, season, location type, camera angle, and mood.",
      "Avoid claiming brands, releases, locations, or people that are not actually visible or cleared.",
      "Treat AI output as a first draft. Stock platforms still expect contributor review.",
    ],
    faqs: [
      {
        question: "Can AI keyword stock video accurately?",
        answer:
          "It can create a strong first draft when it analyzes frames from the clip, but you should still review the output before submitting it to any marketplace.",
      },
      {
        question: "Does ClipMeta work for large batches?",
        answer:
          "Yes. ClipMeta is built around projects and review queues so contributors can process many clips, edit metadata, and export CSVs.",
      },
      {
        question: "Which stock footage platforms does ClipMeta support?",
        answer:
          "ClipMeta supports workflows for Blackbox, Pond5, Adobe Stock, Shutterstock, and general stock footage metadata review.",
      },
    ],
  },
  "blackbox-metadata-generator": {
    slug: "blackbox-metadata-generator",
    eyebrow: "Blackbox metadata generator",
    title: "Blackbox Metadata Generator",
    accent: "for faster CSV uploads",
    description:
      "Create Blackbox-focused titles, descriptions, keywords, and categories from your video frames, then review the batch and export a CSV for your upload workflow.",
    metadataTitle: "Blackbox Metadata Generator | AI CSV Metadata for Footage",
    metadataDescription:
      "Generate Blackbox-ready stock footage metadata with AI. Titles, descriptions, keywords, categories, review tools, and CSV export from ClipMeta.",
    platform: "Blackbox",
    audience: "Blackbox contributors",
    primaryIntent: "prepare Blackbox metadata without spreadsheet cleanup",
    ctaSource: "seo-blackbox-metadata-generator",
    exampleTitle: "Slow aerial push over clear blue water and sandy coastline",
    exampleDescription:
      "Drone video moving over tropical shoreline with turquoise water, small waves, bright sand, and coastal vegetation visible from above.",
    exampleKeywords: [
      "Blackbox",
      "aerial coastline",
      "drone footage",
      "turquoise water",
      "beach",
      "shoreline",
      "travel",
      "tropical",
      "summer",
      "ocean",
      "vacation",
      "nature",
    ],
    workflow: [
      "Upload a Blackbox batch to ClipMeta.",
      "Generate metadata from actual video frames.",
      "Review each clip with thumbnails and inline edits.",
      "Export a CSV for your Blackbox workflow.",
    ],
    benefits: [
      "Reduce repetitive title and keyword writing.",
      "Keep Blackbox batches organized by project.",
      "Catch weak or generic metadata before export.",
      "Move from footage to upload-ready CSV faster.",
    ],
    platformNotes: [
      "Blackbox contributors often work in batches, so consistent keyword structure matters.",
      "Use visible subjects, camera movement, setting, and buyer intent in the metadata.",
      "ClipMeta is not affiliated with Blackbox. Always review current Blackbox upload guidance before submitting.",
    ],
    faqs: [
      {
        question: "Does ClipMeta export a Blackbox CSV?",
        answer:
          "Yes. ClipMeta includes CSV export workflows designed for stock footage contributors, including Blackbox-focused uploads.",
      },
      {
        question: "Can I edit Blackbox metadata before export?",
        answer:
          "Yes. You can review and edit generated titles, descriptions, keywords, and other metadata before downloading your CSV.",
      },
      {
        question: "Is ClipMeta affiliated with Blackbox?",
        answer:
          "No. ClipMeta is an independent metadata workflow tool and is not affiliated with or endorsed by Blackbox.",
      },
    ],
  },
  "pond5-keyword-generator": {
    slug: "pond5-keyword-generator",
    eyebrow: "Pond5 keyword generator",
    title: "Pond5 Keyword Generator",
    accent: "for stock footage batches",
    description:
      "Generate Pond5-style stock video keywords, titles, and descriptions from your footage. Review each clip, remove weak terms, and export cleaner metadata for your submission workflow.",
    metadataTitle: "Pond5 Keyword Generator | AI Keywords for Stock Video",
    metadataDescription:
      "Generate and review Pond5 stock footage keywords with ClipMeta. AI titles, descriptions, keyword lists, and CSV export for video contributors.",
    platform: "Pond5",
    audience: "Pond5 footage contributors",
    primaryIntent: "create accurate Pond5 keywords from visual clip content",
    ctaSource: "seo-pond5-keyword-generator",
    exampleTitle: "Close-up of hands preparing fresh vegetables in a kitchen",
    exampleDescription:
      "Macro kitchen footage showing hands chopping colorful vegetables on a cutting board, with natural light and shallow depth of field.",
    exampleKeywords: [
      "Pond5",
      "cooking",
      "food prep",
      "vegetables",
      "kitchen",
      "close up",
      "healthy food",
      "meal preparation",
      "knife",
      "fresh ingredients",
      "home cooking",
      "lifestyle",
    ],
    workflow: [
      "Drop a Pond5 batch into ClipMeta.",
      "Let AI draft buyer-friendly keywords from video frames.",
      "Review relevance, remove filler, and improve specifics.",
      "Export metadata for the next step in your Pond5 workflow.",
    ],
    benefits: [
      "Create useful keyword variety without repeating the same generic words.",
      "Surface visual details that are easy to miss in a large batch.",
      "Keep titles and descriptions aligned with the keyword set.",
      "Spend more time shooting and less time formatting.",
    ],
    platformNotes: [
      "Pond5 buyers search for specific subjects, actions, settings, and concepts.",
      "Strong metadata should describe what is visible, not what you hope buyers infer.",
      "ClipMeta is not affiliated with Pond5. Always review current Pond5 contributor guidance before submitting.",
    ],
    faqs: [
      {
        question: "What makes a good Pond5 keyword set?",
        answer:
          "A good set balances visible subjects, actions, locations, concepts, shot type, and buyer-use language without adding irrelevant filler.",
      },
      {
        question: "Can ClipMeta keyword drone, nature, food, and lifestyle footage?",
        answer:
          "Yes. ClipMeta analyzes video frames and creates first-draft metadata across common stock footage categories.",
      },
      {
        question: "Is ClipMeta affiliated with Pond5?",
        answer:
          "No. ClipMeta is an independent workflow tool and is not affiliated with or endorsed by Pond5.",
      },
    ],
  },
  "adobe-stock-video-keywords": {
    slug: "adobe-stock-video-keywords",
    eyebrow: "Adobe Stock video keywords",
    title: "Adobe Stock Video Keywords",
    accent: "without the blank spreadsheet",
    description:
      "Draft Adobe Stock video titles, descriptions, and keyword lists from your footage. ClipMeta helps you review relevance, tighten wording, and export organized metadata.",
    metadataTitle: "Adobe Stock Video Keywords | AI Metadata Tool for Footage",
    metadataDescription:
      "Create Adobe Stock video keywords, titles, and descriptions with ClipMeta. AI-assisted stock footage metadata with review and CSV export.",
    platform: "Adobe Stock",
    audience: "Adobe Stock video contributors",
    primaryIntent: "write accurate Adobe Stock video metadata faster",
    ctaSource: "seo-adobe-stock-video-keywords",
    exampleTitle: "Business team reviewing analytics dashboard in a modern office",
    exampleDescription:
      "Video of coworkers looking at charts on a laptop during a strategy meeting in a bright office, suggesting teamwork, planning, and business growth.",
    exampleKeywords: [
      "Adobe Stock",
      "business team",
      "analytics",
      "office",
      "meeting",
      "strategy",
      "laptop",
      "data",
      "teamwork",
      "planning",
      "startup",
      "corporate",
    ],
    workflow: [
      "Upload clips you plan to submit to Adobe Stock.",
      "Generate AI-assisted titles, descriptions, and keywords.",
      "Check for relevance, clarity, and overbroad terms.",
      "Export clean metadata for your upload process.",
    ],
    benefits: [
      "Avoid vague keywords that do not match the clip.",
      "Keep commercial concepts tied to visible content.",
      "Review every title and keyword before marketplace submission.",
      "Build a repeatable workflow for large video batches.",
    ],
    platformNotes: [
      "Adobe Stock contributors should be careful with trademarks, brands, releases, and protected places.",
      "Strong metadata should make the clip searchable while staying accurate to what the buyer can see.",
      "ClipMeta is not affiliated with Adobe or Adobe Stock. Always review current Adobe Stock contributor guidance before submitting.",
    ],
    faqs: [
      {
        question: "Can ClipMeta write Adobe Stock keywords for video?",
        answer:
          "ClipMeta can generate a reviewed first draft of stock video keywords, titles, and descriptions that you can edit before submission.",
      },
      {
        question: "Should I trust AI keywords without reviewing them?",
        answer:
          "No. You should always review AI-generated metadata before submitting to Adobe Stock or any marketplace.",
      },
      {
        question: "Is ClipMeta affiliated with Adobe Stock?",
        answer:
          "No. ClipMeta is an independent metadata workflow tool and is not affiliated with or endorsed by Adobe.",
      },
    ],
  },
  "shutterstock-video-keywording": {
    slug: "shutterstock-video-keywording",
    eyebrow: "Shutterstock video keywording",
    title: "Shutterstock Video Keywording",
    accent: "for high-volume contributors",
    description:
      "Create Shutterstock-style stock video keywords, titles, and descriptions from your clip frames. Review the batch, tighten relevance, and export metadata without rebuilding everything by hand.",
    metadataTitle: "Shutterstock Video Keywording | AI Metadata for Footage",
    metadataDescription:
      "Keyword Shutterstock stock video faster with ClipMeta. Generate titles, descriptions, and keyword lists from footage with review and CSV export.",
    platform: "Shutterstock",
    audience: "Shutterstock footage contributors",
    primaryIntent: "keyword Shutterstock clips with less manual repetition",
    ctaSource: "seo-shutterstock-video-keywording",
    exampleTitle: "Time lapse of storm clouds moving over a city skyline",
    exampleDescription:
      "Dramatic time-lapse footage of dark storm clouds passing above downtown buildings, showing changing weather and urban atmosphere.",
    exampleKeywords: [
      "Shutterstock",
      "time lapse",
      "storm clouds",
      "city skyline",
      "weather",
      "urban",
      "dramatic sky",
      "downtown",
      "cloud movement",
      "storm",
      "cityscape",
      "atmosphere",
    ],
    workflow: [
      "Upload the clips you want to keyword.",
      "Generate first-draft metadata from the actual footage.",
      "Review keyword relevance, order, and specificity.",
      "Export CSV metadata for your submission workflow.",
    ],
    benefits: [
      "Reduce repetitive manual keywording across similar clips.",
      "Keep high-volume batches consistent.",
      "Find visual details beyond the filename.",
      "Review and edit before any marketplace upload.",
    ],
    platformNotes: [
      "Shutterstock search depends on specific, relevant language, not just long keyword lists.",
      "Avoid irrelevant concepts, misleading locations, or brand terms that are not cleared.",
      "ClipMeta is not affiliated with Shutterstock. Always review current Shutterstock contributor guidance before submitting.",
    ],
    faqs: [
      {
        question: "Does ClipMeta keyword Shutterstock videos automatically?",
        answer:
          "ClipMeta creates AI-assisted first drafts from video frames, then gives you a review workflow before export.",
      },
      {
        question: "Can I use the same keywords across similar Shutterstock clips?",
        answer:
          "You can keep batches consistent, but each clip should still be reviewed so the keywords match the specific footage.",
      },
      {
        question: "Is ClipMeta affiliated with Shutterstock?",
        answer:
          "No. ClipMeta is an independent metadata workflow tool and is not affiliated with or endorsed by Shutterstock.",
      },
    ],
  },
} satisfies Record<string, GeneratorPage>;

export type GeneratorPageSlug = keyof typeof GENERATOR_PAGES;

export const GENERATOR_PAGE_SLUGS = Object.keys(GENERATOR_PAGES) as GeneratorPageSlug[];

export function metadataForGeneratorPage(slug: GeneratorPageSlug): Metadata {
  const page = GENERATOR_PAGES[slug];
  const url = `${BASE_URL}/${page.slug}`;
  return {
    title: page.metadataTitle,
    description: page.metadataDescription,
    alternates: { canonical: url },
    openGraph: {
      title: page.metadataTitle,
      description: page.metadataDescription,
      url,
      siteName: "ClipMeta",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metadataTitle,
      description: page.metadataDescription,
    },
  };
}

function schemaForPage(page: GeneratorPage) {
  const url = `${BASE_URL}/${page.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: page.title,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url,
        description: page.metadataDescription,
        publisher: {
          "@type": "Organization",
          name: "ClipMeta",
          url: BASE_URL,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free plan available",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ClipMeta",
            item: BASE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: page.title,
            item: url,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

function RelatedGenerators({ currentSlug }: { currentSlug: string }) {
  const related = GENERATOR_PAGE_SLUGS
    .map((slug) => GENERATOR_PAGES[slug])
    .filter((page) => page.slug !== currentSlug);

  return (
    <div className="mt-10 flex flex-wrap justify-center gap-3">
      {related.map((page) => (
        <Link
          key={page.slug}
          href={`/${page.slug}`}
          className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/65 transition hover:border-violet-400/40 hover:text-white"
        >
          {page.title}
        </Link>
      ))}
    </div>
  );
}

export function GeneratorLandingPage({ slug }: { slug: GeneratorPageSlug }) {
  const page = GENERATOR_PAGES[slug];
  const schema = schemaForPage(page);

  return (
    <FlightDeckShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-28">
        <div>
          <p className="hud-chip mb-5 inline-flex">{page.eyebrow}</p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            {page.title} <span className="gradient-text">{page.accent}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
            {page.description}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href={`/auth?mode=signup&source=${page.ctaSource}`}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
            >
              Try ClipMeta free
            </Link>
            <Link
              href="/tools/metadata-grader"
              className="rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/5"
            >
              Grade one metadata set
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/45">
            Free plan available. No credit card required.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl shadow-violet-950/20 backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Example output</p>
              <p className="mt-1 text-sm text-white/45">{page.platform} metadata draft</p>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Ready to review
            </span>
          </div>
          <div className="space-y-5 pt-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Title</p>
              <p className="mt-2 text-base font-semibold leading-6 text-white">{page.exampleTitle}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Description</p>
              <p className="mt-2 text-sm leading-6 text-white/65">{page.exampleDescription}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Keywords</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {page.exampleKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100/75"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">Built for</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">{page.audience}</h2>
              <p className="mt-4 text-sm leading-6 text-white/55">
                Use ClipMeta when the goal is to {page.primaryIntent}. It is a workflow for reviewed metadata, not a black-box text spinner.
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {page.benefits.map((benefit) => (
                  <div key={benefit} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm leading-6 text-white/72">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">From footage to reviewed metadata</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {page.workflow.map((step, index) => (
              <div key={step} className="rounded-xl border border-white/10 bg-black/30 p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/18 text-sm font-bold text-violet-200">
                  {index + 1}
                </div>
                <p className="mt-5 text-sm leading-6 text-white/68">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">Platform notes</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Use the AI draft carefully</h2>
            <p className="mt-4 text-sm leading-6 text-white/55">
              ClipMeta helps you work faster, but you still control the final metadata that goes to {page.platform}.
            </p>
          </div>
          <div className="space-y-4">
            {page.platformNotes.map((note) => (
              <div key={note} className="rounded-xl border border-orange-300/15 bg-orange-300/10 p-5">
                <p className="text-sm leading-6 text-white/72">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">Frequently asked questions</h2>
          <div className="mt-10 space-y-6">
            {page.faqs.map((faq) => (
              <div key={faq.question} className="border-b border-white/10 pb-6">
                <h3 className="text-base font-semibold text-white">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{faq.answer}</p>
              </div>
            ))}
          </div>
          <RelatedGenerators currentSlug={page.slug} />
        </div>
      </section>

      <section className="border-t border-white/5 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">Start with three free clips today</h2>
          <p className="mt-4 text-base leading-7 text-white/60">
            Upload a few clips, review the generated metadata, and see whether ClipMeta fits your stock footage workflow.
          </p>
          <Link
            href={`/auth?mode=signup&source=${page.ctaSource}-bottom`}
            className="mt-8 inline-flex rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
          >
            Create a free account
          </Link>
        </div>
      </section>
    </FlightDeckShell>
  );
}
