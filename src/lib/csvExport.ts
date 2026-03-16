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

// Blackbox.global valid categories — must match exactly
const BLACKBOX_CATEGORIES = new Set([
  "Animals", "Objects & Equipment", "Arts & Entertainment", "Beauty & Health",
  "Business", "Food", "Drink", "Industry", "Location & Buildings", "Medical",
  "Nature", "Objects & Graphics", "People", "Religion", "Science",
  "Sport & Fitness", "Technology", "Time Lapse", "Transportation", "Travel",
]);

// Map common AI-generated categories to Blackbox equivalents
const CATEGORY_MAP: Record<string, string> = {
  "Wildlife": "Animals",
  "Food & Drink": "Food",
  "Sports & Fitness": "Sport & Fitness",
  "Architecture": "Location & Buildings",
  "Aerial": "Nature",
  "Underwater": "Nature",
  "Lifestyle": "People",
  "Events": "Arts & Entertainment",
  "Abstract": "Objects & Graphics",
  "Health": "Beauty & Health",
  "Entertainment": "Arts & Entertainment",
};

function normalizeBlackboxCategory(category: string): string {
  if (BLACKBOX_CATEGORIES.has(category)) return category;
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];
  // Case-insensitive fallback
  for (const valid of BLACKBOX_CATEGORIES) {
    if (valid.toLowerCase() === category.toLowerCase()) return valid;
  }
  return "Nature"; // Safe default
}

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

/**
 * Blackbox.global CSV — matches their exact upload template:
 * A: File Name | B: Description (15-300 chars) | C: Keywords (8-49, comma-separated, no repetition)
 * D: Category (dropdown) | E: Batch name | F: Editorial (TRUE/FALSE)
 * G: Editorial Text | H: Editorial City | I: Editorial State
 * J: Editorial Country | K: Editorial Date | L: Title (Optional, max 100 chars)
 * M: Shooting Country (Optional) | N: Shooting Date (Optional)
 */
function buildBlackboxCSV(clips: ClipRow[], projectName: string): string {
  const headers = [
    "File Name",
    "Description",
    "Keywords",
    "Category",
    "Batch name",
    "Editorial",
    "Editorial Text",
    "Editorial City",
    "Editorial State",
    "Editorial Country",
    "Editorial Date",
    "Title",
    "Shooting Country",
    "Shooting Date",
  ];
  const rows = clips.map((c) => {
    // Keywords: 8-49, comma-separated, no duplicates
    const kws = [...new Set(c.keywords)].slice(0, 49).join(", ");
    // Description: 15-300 chars
    const desc = (c.description || c.title).slice(0, 300);
    // Title: max 100 chars
    const title = (c.title || "").slice(0, 100);
    return [
      csvEscape(c.filename),                        // A: File Name
      csvEscape(desc),                               // B: Description
      csvEscape(kws),                                // C: Keywords
      csvEscape(normalizeBlackboxCategory(c.category)), // D: Category
      csvEscape(projectName),          // E: Batch name
      csvEscape("FALSE"),              // F: Editorial
      csvEscape(""),                   // G: Editorial Text
      csvEscape(""),                   // H: Editorial City
      csvEscape(""),                   // I: Editorial State
      csvEscape(""),                   // J: Editorial Country
      csvEscape(""),                   // K: Editorial Date
      csvEscape(title),                // L: Title (Optional)
      csvEscape(c.location ?? ""),     // M: Shooting Country (Optional)
      csvEscape(""),                   // N: Shooting Date (Optional)
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
