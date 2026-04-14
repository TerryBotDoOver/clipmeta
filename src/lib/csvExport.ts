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

// Blackbox.global valid categories - must match exactly
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

/** Convert any date string to Blackbox "MM DD YYYY" format (with spaces) */
function formatBlackboxDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Can't parse, return as-is
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm} ${dd} ${yyyy}`;
  } catch {
    return dateStr;
  }
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
  is_editorial?: boolean | null;
  editorial_text?: string | null;
  editorial_city?: string | null;
  editorial_state?: string | null;
  editorial_country?: string | null;
  editorial_date?: string | null;
};

/** Ensure filename has a video extension - platforms require it for matching */
function ensureExtension(filename: string): string {
  if (!filename) return filename;
  const hasExt = /\.[a-zA-Z0-9]{2,4}$/.test(filename);
  return hasExt ? filename : `${filename}.mp4`;
}

// Shutterstock valid VIDEO categories - must match exactly
const SHUTTERSTOCK_VIDEO_CATEGORIES = new Set([
  "Animals/Wildlife", "Arts", "Backgrounds/Textures", "Buildings/Landmarks",
  "Business/Finance", "Education", "Food and drink", "Healthcare/Medical",
  "Holidays", "Industrial", "Nature", "Objects", "People", "Religion",
  "Science", "Signs/Symbols", "Sports/Recreation", "Technology", "Transportation",
]);

// Map AI-generated categories to Shutterstock equivalents
const SHUTTERSTOCK_CATEGORY_MAP: Record<string, string> = {
  "Animals": "Animals/Wildlife",
  "Wildlife": "Animals/Wildlife",
  "Architecture": "Buildings/Landmarks",
  "Location & Buildings": "Buildings/Landmarks",
  "Business": "Business/Finance",
  "Food": "Food and drink",
  "Food & Drink": "Food and drink",
  "Drink": "Food and drink",
  "Medical": "Healthcare/Medical",
  "Beauty & Health": "Healthcare/Medical",
  "Sport & Fitness": "Sports/Recreation",
  "Sports": "Sports/Recreation",
  "Travel": "Nature",
  "Lifestyle": "People",
  "Entertainment": "Arts",
  "Arts & Entertainment": "Arts",
  "Objects & Equipment": "Objects",
  "Objects & Graphics": "Objects",
  "Abstract": "Backgrounds/Textures",
  "Time Lapse": "Nature",
  "Aerial": "Nature",
  "Underwater": "Nature",
  "Industry": "Industrial",
};

function normalizeShutterstockCategory(category: string): string {
  if (!category) return "Nature";
  if (SHUTTERSTOCK_VIDEO_CATEGORIES.has(category)) return category;
  if (SHUTTERSTOCK_CATEGORY_MAP[category]) return SHUTTERSTOCK_CATEGORY_MAP[category];
  // Case-insensitive fallback
  for (const valid of SHUTTERSTOCK_VIDEO_CATEGORIES) {
    if (valid.toLowerCase() === category.toLowerCase()) return valid;
  }
  return "Nature"; // Safe default
}

/**
 * Shutterstock CSV - matches their exact upload template:
 * Filename | Description | Keywords | Categories | Editorial | Mature content | illustration
 *
 * Description: max 200 chars
 * Keywords: up to 50, comma-separated
 * Categories: 1-2 from Shutterstock's fixed list, comma-separated
 * Editorial/Mature/illustration: yes/no
 */
function buildShutterstockCSV(clips: ClipRow[], projectName: string, editorial?: EditorialFields): string {
  const headers = ["Filename", "Description", "Keywords", "Categories", "Editorial", "Mature content", "illustration"];
  const rows = clips.map((c) => {
    const kws = [...new Set(c.keywords)].slice(0, 50).join(",");
    const desc = (c.description || c.title).slice(0, 200);
    const category = normalizeShutterstockCategory(c.category);
    const clipIsEditorial = c.is_editorial != null ? c.is_editorial : (editorial?.isEditorial ?? false);
    return [
      csvEscape(ensureExtension(c.filename)),          // Filename
      csvEscape(desc),                 // Description (max 200 chars)
      csvEscape(kws),                  // Keywords (comma-separated)
      csvEscape(category),             // Categories
      csvEscape(clipIsEditorial ? "yes" : "no"),       // Editorial
      csvEscape("no"),                 // Mature content
      csvEscape("no"),                 // illustration (video = always no)
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

// Adobe Stock category number map (from their upload-CSV dialog)
const ADOBE_CATEGORY_MAP: Record<string, string> = {
  "Animals": "1",
  "Buildings and Architecture": "2",
  "Business": "3",
  "Drinks": "4",
  "The Environment": "5",
  "States of Mind": "6",
  "Food": "7",
  "Graphic Resources": "8",
  "Hobbies and Leisure": "9",
  "Industry": "10",
  "Landscape": "11",
  "Lifestyle": "12",
  "People": "13",
  "Plants and Flowers": "14",
  "Culture and Religion": "15",
  "Science": "16",
  "Social Issues": "17",
  "Sports": "18",
  "Technology": "19",
  "Transport": "20",
  "Travel": "21",
  "Urban": "22",
  "Celebrations": "23",
  "Nature": "5",
  "Abstract": "8",
  "Aerial": "21",
  "Drone": "11",
  "Underwater": "5",
  "Weather": "5",
  "Space": "16",
  "Holidays": "23",
};

function toAdobeCategoryNumber(category: string): string {
  if (!category) return "12"; // default to Lifestyle
  // Check direct match
  if (ADOBE_CATEGORY_MAP[category]) return ADOBE_CATEGORY_MAP[category];
  // Check case-insensitive
  const lower = category.toLowerCase();
  for (const [key, val] of Object.entries(ADOBE_CATEGORY_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }
  // If already a number, pass through
  if (/^\d+$/.test(category.trim())) return category.trim();
  // Default to Lifestyle (12)
  return "12";
}

/** Adobe Stock: keywords comma-separated, title field critical, first 5 keywords weighted */
function buildAdobeCSV(clips: ClipRow[]): string {
  const headers = ["Filename", "Title", "Keywords", "Category", "Releases"];
  const rows = clips.map((c) => {
    // Adobe: keywords comma+space separated, max 49, most important first
    const kws = c.keywords.slice(0, 49).join(", ");
    return [
      csvEscape(ensureExtension(c.filename)),
      csvEscape(c.title.slice(0, 200)), // Adobe title max 200 chars
      csvEscape(kws),
      toAdobeCategoryNumber(c.category), // Must be a number, not text
      csvEscape(""), // Releases - blank unless model releases were uploaded
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Pond5 CSV - matches their exact XLSX upload template:
 * originalfilename | title | description | keywords | city | region | country
 * specifysource | modelreleased | propertyreleased | release | copyright
 * price | pricelarge | editorial
 *
 * Keywords: comma-separated, max 50
 * Title: max 100 chars
 * Description: natural language, up to 500 chars
 */
function buildPond5CSV(clips: ClipRow[], editorial?: EditorialFields): string {
  const headers = [
    "originalfilename",
    "title",
    "description",
    "keywords",
    "city",
    "region",
    "country",
    "specifysource",
    "modelreleased",
    "propertyreleased",
    "release",
    "copyright",
    "price",
    "pricelarge",
    "editorial",
  ];
  const rows = clips.map((c) => {
    const kws = [...new Set(c.keywords)].slice(0, 50).join(",");
    const title = (c.title || "").slice(0, 100);
    const desc = (c.description || "").slice(0, 500);
    // Location is stored as country-level - put in country column
    // Guard against literal string "null" from older AI responses
    const rawLoc = c.location ?? "";
    const country = (rawLoc === "null" || rawLoc === "NULL" || rawLoc.toLowerCase() === "null") ? "" : rawLoc;
    // Per-clip editorial override: use clip fields if set (non-null), else fall back to project
    const clipIsEditorial = c.is_editorial != null ? c.is_editorial : (editorial?.isEditorial ?? false);
    const clipEditorialCity = c.editorial_city != null ? c.editorial_city : (editorial?.editorialCity || "");
    const clipEditorialState = c.editorial_state != null ? c.editorial_state : (editorial?.editorialState || "");
    const clipEditorialCountry = c.editorial_country != null ? c.editorial_country : (editorial?.editorialCountry || "");
    return [
      csvEscape(ensureExtension(c.filename)),          // originalfilename
      csvEscape(title),               // title
      csvEscape(desc),                // description
      csvEscape(kws),                 // keywords (comma-separated)
      csvEscape(clipEditorialCity),    // city
      csvEscape(clipEditorialState),   // region
      csvEscape(clipEditorialCountry || country), // country - prefer editorial country, fall back to location
      csvEscape(""),                  // specifysource
      csvEscape(""),                  // modelreleased - blank = unspecified
      csvEscape(""),                  // propertyreleased - blank = unspecified
      csvEscape(""),                  // release - release filename if applicable
      csvEscape(""),                  // copyright - contributor fills in
      csvEscape(""),                  // price - use Pond5 default pricing
      csvEscape(""),                  // pricelarge - use Pond5 default pricing
      csvEscape(clipIsEditorial ? "yes" : "no"), // editorial
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

// Blackbox restricted words/phrases - case-insensitive, removed from titles, descriptions, and keywords
const BLACKBOX_RESTRICTED_WORDS = [
  "despain", "rekindle", "sexting", "shutterstock", "pond5", "istock", "freepik",
  "getty", "getty images", "adobestock", "adobe stock", "depositphotos", "envato",
  "envato elements", "videohive", "storyblocks", "artlist", "artgrid", "motion array",
  "videvo", "bigstock", "123rf", "alamy", "dissolve", "filmsupply", "rocketstock",
  "artbeats", "videezy", "terrorism", "stripper", "prostitute", "nudist",
  "sex and human sexual activity", "sexual issues", "naked", "breast", "nipple",
  "human groin", "buttocks", "reproductive organ", "sex toy", "fuck", "erotic",
  "penis", "bitch", "foreplay", "fetish", "crotch", "slut", "bondage", "kinky",
  "confederate flag", "qanon", "q anon", "wound", "injury", "bomb", "bombing",
  "blackbox", "blackboxguild", "honky", "audi", "svg", "mixed race", "mixed-race",
  "sexy", "paki", "wop", "homo", "oral sex", "sex symbol", "eroticism", "munt",
  "kike", "mulato", "squaw", "afro-american", "folgefonna",
];

// Sort by length descending so longer phrases are matched/removed before substrings
const _sortedRestricted = [...BLACKBOX_RESTRICTED_WORDS].sort((a, b) => b.length - a.length);

function filterBlackboxText(text: string): string {
  let result = text;
  for (const word of _sortedRestricted) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(regex, "");
  }
  // Clean up double (or more) spaces left behind
  return result.replace(/  +/g, " ").trim();
}

function filterBlackboxKeywords(keywords: string[]): string[] {
  return keywords.filter((kw) => {
    const lower = kw.toLowerCase();
    return !_sortedRestricted.some((w) => lower.includes(w));
  });
}

/**
 * Blackbox keyword deduplication: no single WORD may appear more than 4 times
 * across all keywords combined (Blackbox's "Redundant keywords" rule).
 */
function deduplicateBlackboxKeywords(keywords: string[]): string[] {
  // First deduplicate exact keyword phrases
  const unique = [...new Set(keywords)];
  const wordCount: Record<string, number> = {};
  const result: string[] = [];

  for (const kw of unique) {
    const words = kw.toLowerCase().split(/\s+/);
    // Check if adding this keyword would push any word over 4 occurrences
    const wouldExceed = words.some(w => (wordCount[w] || 0) >= 4);
    if (wouldExceed) continue;
    // Add keyword and increment word counts
    result.push(kw);
    for (const w of words) {
      wordCount[w] = (wordCount[w] || 0) + 1;
    }
  }
  return result;
}

/**
 * Blackbox.global CSV - matches their exact upload template:
 * A: File Name | B: Description (15-300 chars) | C: Keywords (8-49, comma-separated, no repetition)
 * D: Category (dropdown) | E: Batch name | F: Editorial (TRUE/FALSE)
 * G: Editorial Text | H: Editorial City | I: Editorial State
 * J: Editorial Country | K: Editorial Date | L: Title (Optional, max 100 chars)
 * M: Shooting Country (Optional) | N: Shooting Date (Optional)
 */
export interface EditorialFields {
  isEditorial?: boolean;
  editorialText?: string;
  editorialCity?: string;
  editorialState?: string;
  editorialCountry?: string;
  editorialDate?: string;
}

function buildBlackboxCSV(clips: ClipRow[], projectName: string, projectLocation?: string, projectShootingDate?: string, editorial?: EditorialFields): string {
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
    // Apply restricted word filter before any other processing
    const filteredKeywords = filterBlackboxKeywords(c.keywords);
    const filteredDesc = filterBlackboxText(c.description || c.title);
    const filteredTitle = filterBlackboxText(c.title || "");
    // Keywords: 8-49, comma-separated, no duplicates, no word appearing >4 times (Blackbox rule)
    const kws = deduplicateBlackboxKeywords(filteredKeywords).slice(0, 49).join(", ");
    // Description: 15-300 chars
    const desc = filteredDesc.slice(0, 300);
    // Title: max 100 chars
    const title = filteredTitle.slice(0, 100);
    // Per-clip editorial override: use clip fields if set (non-null), else fall back to project
    const clipIsEditorial = c.is_editorial != null ? c.is_editorial : (editorial?.isEditorial ?? false);
    const clipEditorialText = c.editorial_text != null ? c.editorial_text : (editorial?.editorialText || "");
    const clipEditorialCity = c.editorial_city != null ? c.editorial_city : (editorial?.editorialCity || "");
    const clipEditorialState = c.editorial_state != null ? c.editorial_state : (editorial?.editorialState || "");
    const clipEditorialCountry = c.editorial_country != null ? c.editorial_country : (editorial?.editorialCountry || "");
    const rawEditorialDate = c.editorial_date != null ? c.editorial_date : (editorial?.editorialDate || "");
    // Blackbox requires editorial date in "MM DD YYYY" format (with spaces)
    const clipEditorialDate = formatBlackboxDate(rawEditorialDate);
    return [
      csvEscape(ensureExtension(c.filename)),                        // A: File Name
      csvEscape(desc),                               // B: Description
      csvEscape(kws),                                // C: Keywords
      csvEscape(normalizeBlackboxCategory(c.category)), // D: Category
      csvEscape(projectName),          // E: Batch name
      csvEscape(clipIsEditorial ? "TRUE" : "FALSE"),              // F: Editorial
      csvEscape(clipEditorialText),                        // G: Editorial Text
      csvEscape(clipEditorialCity),                        // H: Editorial City
      csvEscape(clipEditorialState),                       // I: Editorial State
      csvEscape(clipEditorialCountry),                     // J: Editorial Country
      csvEscape(clipEditorialDate),                        // K: Editorial Date
      csvEscape(title),                // L: Title (Optional)
      csvEscape(projectLocation || (c.location ?? "").replace(/^null$/i, "")),  // M: Shooting Country (Optional)
      csvEscape(projectShootingDate || ""),          // N: Shooting Date (Optional)
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

/** Generic: all fields */
function buildGenericCSV(clips: ClipRow[]): string {
  const headers = ["Filename", "Title", "Description", "Keywords", "Category", "Location", "Confidence"];
  const rows = clips.map((c) => [
    csvEscape(ensureExtension(c.filename)),
    csvEscape(c.title),
    csvEscape(c.description),
    csvEscape(c.keywords.join(", ")),
    csvEscape(c.category),
    csvEscape((c.location ?? "").replace(/^null$/i, "")),
    csvEscape(c.confidence),
  ].join(","));
  return [headers.join(","), ...rows].join("\r\n");
}

// Platform keyword caps (hard limits from each platform's submission guidelines)
const PLATFORM_KEYWORD_MAX: Record<ExportPlatform, number> = {
  blackbox: 49,
  shutterstock: 50,
  adobe: 49,
  pond5: 50,
  generic: 999,
};

export function buildCSV(
  platform: ExportPlatform,
  clips: ClipRow[],
  projectName: string,
  projectLocation?: string,
  projectShootingDate?: string,
  editorial?: EditorialFields,
  userKeywordLimit?: number
): string {
  // Apply the user's keyword limit — respect their setting, capped by the platform max.
  // If user set 22, they get 22 (even though the platform allows 49-50).
  // If user set 60, they get 49 or 50 (platform cap).
  const platformMax = PLATFORM_KEYWORD_MAX[platform] ?? 999;
  const effectiveLimit = userKeywordLimit
    ? Math.min(userKeywordLimit, platformMax)
    : platformMax;

  // Trim keywords on every clip before passing to platform-specific formatter
  const trimmedClips = clips.map(c => ({
    ...c,
    keywords: c.keywords.slice(0, effectiveLimit),
  }));

  switch (platform) {
    case "shutterstock":
      return buildShutterstockCSV(trimmedClips, projectName, editorial);
    case "adobe":
      return buildAdobeCSV(trimmedClips);
    case "pond5":
      return buildPond5CSV(trimmedClips, editorial);
    case "blackbox":
      return buildBlackboxCSV(trimmedClips, projectName, projectLocation, projectShootingDate, editorial);
    default:
      return buildGenericCSV(trimmedClips);
  }
}

export function getExportFilename(
  platform: ExportPlatform,
  projectSlug: string
): string {
  return `${projectSlug}-${platform}.csv`;
}
