import type { Metadata } from "next";
import { FlightDeckShell } from "@/components/landing/FlightDeckShell";
import { MetadataGraderClient } from "./MetadataGraderClient";

export const metadata: Metadata = {
  title: "Free Metadata Grader for Stock Footage — ClipMeta",
  description:
    "Paste one title, description, and keyword list. Get an instant 0-100 grade against stock-footage best practices for Blackbox, Shutterstock, Adobe Stock, and Pond5. Free, no signup.",
  keywords: [
    "stock footage metadata grader",
    "metadata quality checker",
    "keyword grader",
    "stock footage SEO",
    "blackbox metadata",
    "shutterstock keywords",
    "adobe stock metadata",
    "pond5 metadata",
  ],
  openGraph: {
    title: "Free Metadata Grader for Stock Footage",
    description:
      "Score your stock-footage metadata in seconds. Free tool by ClipMeta — works for Blackbox, Shutterstock, Adobe Stock, and Pond5.",
    type: "website",
    url: "https://clipmeta.app/tools/metadata-grader",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Metadata Grader for Stock Footage",
    description:
      "Score your stock-footage metadata in seconds. Free tool by ClipMeta.",
  },
  alternates: {
    canonical: "https://clipmeta.app/tools/metadata-grader",
  },
};

const metadataGraderSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://clipmeta.app/tools/metadata-grader#software",
      name: "ClipMeta Metadata Grader",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Stock footage metadata checker",
      operatingSystem: "Web",
      browserRequirements: "Requires a modern web browser",
      isAccessibleForFree: true,
      url: "https://clipmeta.app/tools/metadata-grader",
      description:
        "Free tool that scores stock-footage metadata (title, description, keywords) against best practices for Blackbox, Shutterstock, Adobe Stock, and Pond5.",
      featureList: [
        "Score stock footage titles, descriptions, and keywords",
        "Check keyword relevance and coverage",
        "Identify weak, repetitive, or missing metadata",
        "Review metadata before submitting clips to stock marketplaces",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      publisher: {
        "@type": "Organization",
        "@id": "https://clipmeta.app/#organization",
        name: "ClipMeta",
        url: "https://clipmeta.app",
      },
    },
    {
      "@type": "WebPage",
      "@id": "https://clipmeta.app/tools/metadata-grader",
      name: "Free Metadata Grader for Stock Footage",
      url: "https://clipmeta.app/tools/metadata-grader",
      description: metadata.description,
      mainEntity: {
        "@id": "https://clipmeta.app/tools/metadata-grader#software",
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://clipmeta.app/tools/metadata-grader#breadcrumb",
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
          name: "Free Metadata Grader",
          item: "https://clipmeta.app/tools/metadata-grader",
        },
      ],
    },
  ],
};

export default function MetadataGraderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(metadataGraderSchema) }}
      />
      <FlightDeckShell>
        <MetadataGraderClient />
      </FlightDeckShell>
    </>
  );
}
