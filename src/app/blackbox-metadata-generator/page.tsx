import { GeneratorLandingPage, metadataForGeneratorPage } from "@/components/seo/generatorPages";

export const metadata = metadataForGeneratorPage("blackbox-metadata-generator");

export default function BlackboxMetadataGeneratorPage() {
  return <GeneratorLandingPage slug="blackbox-metadata-generator" />;
}
