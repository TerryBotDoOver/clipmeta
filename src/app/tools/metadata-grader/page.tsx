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

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ClipMeta Metadata Grader",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Free tool that scores stock-footage metadata (title, description, keywords) against best practices for Blackbox, Shutterstock, Adobe Stock, and Pond5.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  url: "https://clipmeta.app/tools/metadata-grader",
  publisher: {
    "@type": "Organization",
    name: "ClipMeta",
    url: "https://clipmeta.app",
  },
};

export default function MetadataGraderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <FlightDeckShell>
        <MetadataGraderClient />
      </FlightDeckShell>
    </>
  );
}
