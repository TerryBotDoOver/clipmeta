/**
 * Platform-specific CSV export formats for stock footage metadata.
 * Each platform has different column requirements, keyword limits, and formatting rules.
 */

export type ExportPlatform =
  | "blackbox"
  | "shutterstock"
  | "adobe"
  | "pond5"
  | "generic";

export const PLATFORM_LABELS: Record<ExportPlatform, string> = {
  blackbox: "Blackbox.global",
  shutterstock: "Shutterstock",
  adobe: "Adobe Stock",
  pond5: "Pond5",
  generic: "Generic CSV",
};

function csvEscape(value: string): string {
  if (!value) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

type ClipRow = {
  filename: string;
  title: string;
  description: string;
  keywords: string[];
  category: string;
  location: string | null;
  confidence: string;
};

/** Shutterstock: max 50 keywords, keywords as semicolon-separated, no duplicates */
function buildShutterstockCSV(clips: ClipRow[], projectName: string): string {
  const headers = ["Filename", "Description", "Keywords", "Editorial"];
  const rows = clips.map((c) => {
    const kws = [...new Set(c.keywords)].slice(0, 50).join(";");
    return [
      csvEscape(c.filename),
      csvEscape(c.description || c.title),
      csvEscape(kws),
      csvEscape("no"), // editorial flag
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

/** Adobe Stock: keywords comma-separated, title field critical, first 5 keywords weighted */
function buildAdobeCSV(clips: ClipRow[]): string {
  const headers = ["Filename", "Title", "Keywords", "Category", "Releases"];
  const rows = clips.map((c) => {
    // Adobe weights first 4-5 keywords most heavily
    const kws = c.keywords.slice(0, 49).join(",");
    return [
      csvEscape(c.filename),
      csvEscape(c.title),
      csvEscape(kws),
      csvEscape(c.category),
      csvEscape(""),
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

/** Pond5: title, description, keywords pipe-separated, category */
function buildPond5CSV(clips: ClipRow[]): string {
  const headers = ["clip_title", "clip_description", "clip_keywords", "clip_categories"];
  const rows = clips.map((c) => {
    const kws = c.keywords.slice(0, 50).join("|");
    return [
      csvEscape(c.title),
      csvEscape(c.description),
      csvEscape(kws),
      csvEscape(c.category),
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

/** Blackbox.global: filename, title, description, keywords comma-separated, category, location */
function buildBlackboxCSV(clips: ClipRow[], projectName: string): string {
  const headers = ["filename", "title", "description", "keywords", "category", "location"];
  const rows = clips.map((c) => {
    const kws = c.keywords.slice(0, 50).join(", ");
    return [
      csvEscape(c.filename),
      csvEscape(c.title),
      csvEscape(c.description),
      csvEscape(kws),
      csvEscape(c.category),
      csvEscape(c.location ?? ""),
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

/** Generic: all fields */
function buildGenericCSV(clips: ClipRow[]): string {
  const headers = ["Filename", "Title", "Description", "Keywords", "Category", "Location", "Confidence"];
  const rows = clips.map((c) => [
    csvEscape(c.filename),
    csvEscape(c.title),
    csvEscape(c.description),
    csvEscape(c.keywords.join(", ")),
    csvEscape(c.category),
    csvEscape(c.location ?? ""),
    csvEscape(c.confidence),
  ].join(","));
  return [headers.join(","), ...rows].join("\r\n");
}

export function buildCSV(
  platform: ExportPlatform,
  clips: ClipRow[],
  projectName: string
): string {
  switch (platform) {
    case "shutterstock":
      return buildShutterstockCSV(clips, projectName);
    case "adobe":
      return buildAdobeCSV(clips);
    case "pond5":
      return buildPond5CSV(clips);
    case "blackbox":
      return buildBlackboxCSV(clips, projectName);
    default:
      return buildGenericCSV(clips);
  }
}

export function getExportFilename(
  platform: ExportPlatform,
  projectSlug: string
): string {
  return `${projectSlug}-${platform}.csv`;
}
