export type GraderSeverity = "error" | "warning" | "tip";

export type GraderArea =
  | "title"
  | "description"
  | "keywords"
  | "overall"
  | "uniqueness"
  | "specificity"
  | "seo";

export type GraderIssue = {
  level: GraderSeverity;
  area: GraderArea;
  message: string;
  examples?: string[];
};

export type GraderPlatform = "blackbox" | "shutterstock" | "adobe_stock" | "pond5";

export type GraderBreakdown = {
  title: number;
  description: number;
  keywords: number;
  uniqueness: number;
  specificity: number;
  seo: number;
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
};

export type GraderBenchmarks = {
  totalVideos: number;
  avgTitleWordCount: number;
  avgContentWordCount: number;
  pctTitlesWithGenericTerms: number;
  pctTitlesTooVague: number;
  keyFinding: string;
  bestExamples: string[];
  worstExamples: string[];
};

export type GraderResult = {
  breakdown: GraderBreakdown;
  issues: GraderIssue[];
  strengths: string[];
  suggestions: string[];
  stats: {
    titleChars: number;
    titleWords: number;
    descriptionChars: number;
    descriptionSentences: number;
    keywordCount: number;
    fillerKeywords: number;
    duplicateKeywords: number;
    nearDuplicateKeywords: number;
    titleEchoedInKeywords: number;
    specificKeywords: number;
    idealKeywordRange: [number, number];
  };
  benchmarks: GraderBenchmarks;
  platform: GraderPlatform;
};

// Keyword-count "sweet spot" per platform — used for the keyword-count sub-score
const PLATFORM_KEYWORD_RANGES: Record<GraderPlatform, [number, number]> = {
  blackbox: [30, 50],
  shutterstock: [15, 50],
  adobe_stock: [15, 49],
  pond5: [10, 50],
};

export const PLATFORM_DISPLAY_NAMES: Record<GraderPlatform, string> = {
  blackbox: "Blackbox",
  shutterstock: "Shutterstock",
  adobe_stock: "Adobe Stock",
  pond5: "Pond5",
};

// Words that, when they show up in a stock title, almost never earn their slot
const GENERIC_TITLE_TERMS = new Set([
  "aerial",
  "view",
  "footage",
  "video",
  "shot",
  "drone",
  "background",
  "scene",
  "stock",
  "motion",
  "clip",
]);

// Overused adjectives and meaningless filler words ("stock-shopper language")
const TITLE_FILLER_ADJECTIVES = new Set([
  "amazing",
  "beautiful",
  "stunning",
  "nice",
  "great",
  "awesome",
  "incredible",
  "lovely",
  "wonderful",
  "magnificent",
  "gorgeous",
]);

const FILLER_KEYWORDS = new Set([
  "video",
  "footage",
  "clip",
  "stock",
  "mp4",
  "file",
  "shot",
  "frame",
  "recording",
  "movie",
  "film",
  "cinema",
  "image",
  "photo",
  "photograph",
  "picture",
  "beautiful",
  "stunning",
  "amazing",
  "nice",
  "great",
  "awesome",
  "lovely",
  "wonderful",
  "youtube intro",
  "website hero",
  "background video",
  "commercial use",
  "travel commercial",
  "tourism ad",
  "nature documentary",
  "promotional video",
  "intro footage",
  "promo video",
  "marketing video",
  "social media",
]);

const WEAK_FIRST_KEYWORDS = new Set([
  "nature",
  "water",
  "sky",
  "outdoor",
  "outdoors",
  "background",
  "beautiful",
  "scene",
  "view",
  "light",
  "color",
  "colours",
  "colors",
  "image",
  "photo",
  "landscape",
  "environment",
]);

// Concrete specific descriptors that ADD search value
const SPECIFIC_DESCRIPTORS = new Set([
  "4k",
  "8k",
  "hd",
  "60fps",
  "120fps",
  "timelapse",
  "time-lapse",
  "hyperlapse",
  "slow motion",
  "slow-motion",
  "aerial",
  "drone",
  "handheld",
  "tripod",
  "gimbal",
  "wide angle",
  "close-up",
  "macro",
  "telephoto",
  "golden hour",
  "blue hour",
  "sunrise",
  "sunset",
  "dusk",
  "dawn",
  "overcast",
  "pov",
  "bird's eye",
  "top down",
  "low angle",
  "dolly",
  "tracking shot",
  "long exposure",
  "bokeh",
  "shallow depth",
  "cinematic",
  "documentary style",
]);

// Description motion / use-case cues
const DESCRIPTION_CUE_REGEX =
  /(with|featuring|showing|capturing|gliding|moving|flowing|standing|walking|running|rolling|drifting|ideal for|perfect for|great for|suitable for|use case|waves|sunlight|traffic|city|coast|forest|mountain|valley|rural|urban|studio)/i;

const BENCHMARKS: GraderBenchmarks = {
  totalVideos: 1000,
  avgTitleWordCount: 6.32,
  avgContentWordCount: 4.74,
  pctTitlesWithGenericTerms: 30,
  pctTitlesTooVague: 4.9,
  keyFinding:
    "30% of real stock titles still waste space on generic filler like aerial, view, footage, and video. Strong titles stay specific.",
  bestExamples: [
    "rustic windmills in a golden field at dusk",
    "majestic buddhist statue in tranquil park",
    "snowy mountain hike with scenic views",
  ],
  worstExamples: [
    "a picturesque view of nature",
    "drone footage of rapids",
    "waterfall video",
  ],
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function gradeFromScore(score: number): GraderBreakdown["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function getRoot(word: string): string {
  return word
    .replace(/ness$/, "")
    .replace(/ful$/, "")
    .replace(/tion$/, "")
    .replace(/ing$/, "")
    .replace(/edly$/, "")
    .replace(/ly$/, "")
    .replace(/ed$/, "")
    .replace(/es$/, "")
    .replace(/s$/, "");
}

function splitWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function parseKeywords(value: string) {
  return value
    .split(/[\n,]+/)
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Count sentence-ending punctuation, fall back to 1 if any content
  const matches = trimmed.match(/[.!?]+(?:\s|$)/g);
  return matches ? matches.length : 1;
}

// ─────────────────────────────────────────────────────────
// Category scorers — each returns 0-100
// ─────────────────────────────────────────────────────────

function scoreTitle(
  title: string,
  issues: GraderIssue[],
  strengths: string[],
  suggestions: string[],
) {
  let score = 100;
  const trimmed = title.trim();
  const charCount = trimmed.length;
  const words = splitWords(trimmed);
  const genericTerms = words.filter((word) => GENERIC_TITLE_TERMS.has(word));
  const fillerAdjectives = words.filter((word) => TITLE_FILLER_ADJECTIVES.has(word));
  const uniqueWords = new Set(words);

  if (!trimmed) {
    issues.push({
      level: "error",
      area: "title",
      message: "No title provided. A strong title is the single biggest factor in stock search ranking.",
    });
    return { score: 0, charCount: 0, wordCount: 0 };
  }

  // Length: target 60-120 chars
  if (charCount < 30) {
    issues.push({
      level: "error",
      area: "title",
      message: `Title is only ${charCount} chars. Target 60-120 chars so buyers get subject, setting, and action.`,
    });
    score -= 25;
  } else if (charCount < 60) {
    issues.push({
      level: "warning",
      area: "title",
      message: `Title is ${charCount} chars. Expand toward 60-120 so there's room for subject, action, and setting.`,
    });
    score -= 12;
  } else if (charCount <= 120) {
    strengths.push("Title length is in the 60-120 char sweet spot for stock marketplaces.");
  } else if (charCount > 200) {
    issues.push({
      level: "error",
      area: "title",
      message: `Title is ${charCount} chars — most platforms truncate beyond 200. Trim filler.`,
    });
    score -= 18;
  } else {
    issues.push({
      level: "warning",
      area: "title",
      message: `Title is ${charCount} chars. A shorter, tighter title (60-120) usually ranks better.`,
    });
    score -= 6;
  }

  // ALL CAPS check
  if (trimmed.length > 10 && trimmed === trimmed.toUpperCase()) {
    issues.push({
      level: "error",
      area: "title",
      message: "Title is in ALL CAPS. Marketplaces often flag this as spammy — use sentence case.",
    });
    score -= 15;
  }

  // Trailing punctuation
  if (/[.!?,;:]$/.test(trimmed)) {
    issues.push({
      level: "warning",
      area: "title",
      message: "Title has trailing punctuation. Stock titles read better without it.",
    });
    score -= 5;
  }

  // Starts with a file-type filler
  if (/^(video|footage|clip|stock)\b/i.test(trimmed)) {
    issues.push({
      level: "error",
      area: "title",
      message:
        'Don\'t start the title with "video," "footage," or "stock." Buyers search for the scene, not the file type.',
    });
    score -= 18;
  }

  // Stock-filler adjectives
  if (fillerAdjectives.length > 0) {
    const unique = [...new Set(fillerAdjectives)];
    issues.push({
      level: "error",
      area: "title",
      message: `Title uses overused stock filler: "${unique.join('", "')}". Replace with a specific descriptor (e.g. "golden hour", "rocky", "misty").`,
      examples: unique,
    });
    score -= Math.min(22, unique.length * 10);
  }

  // Generic terms like aerial/drone/footage/view
  if (genericTerms.length >= 2) {
    issues.push({
      level: "error",
      area: "title",
      message: `Too much generic title language (${[...new Set(genericTerms)].join(", ")}). Strong stock winners lead with the subject, setting, or action instead.`,
      examples: BENCHMARKS.bestExamples,
    });
    score -= 18;
  } else if (genericTerms.length === 0 && words.length >= 5 && fillerAdjectives.length === 0) {
    strengths.push("Title avoids the most common generic stock filler terms.");
  }

  // Subject + action + setting heuristic (needs at least 5 unique meaningful words)
  if (words.length < 5) {
    issues.push({
      level: "warning",
      area: "title",
      message: `Your title is only ${words.length} words. Aim for 6-9 with a subject + action + setting structure.`,
    });
    score -= 12;
    suggestions.push("Restructure your title as [subject] + [action or descriptor] + [setting or mood]. Example: \"rustic windmills in a golden field at dusk\".");
  }

  if (uniqueWords.size <= 3 || words.length - uniqueWords.size >= 2) {
    issues.push({
      level: "warning",
      area: "title",
      message: "Your title feels repetitive or too vague. Try adding one concrete subject, one setting, and one action or mood cue.",
      examples: BENCHMARKS.worstExamples,
    });
    score -= 10;
  }

  return { score: clamp(score), charCount, wordCount: words.length };
}

function scoreDescription(
  description: string,
  title: string,
  issues: GraderIssue[],
  strengths: string[],
  suggestions: string[],
) {
  let score = 100;
  const trimmed = description.trim();
  const charCount = trimmed.length;
  const sentences = countSentences(trimmed);

  if (charCount === 0) {
    issues.push({
      level: "error",
      area: "description",
      message: "No description provided. A stock description should clarify subject, motion, and use case.",
    });
    suggestions.push("Write at least 2 sentences: one describing the scene literally, one mentioning the best buyer use case (e.g. \"Ideal for travel documentaries and tourism ads\").");
    return { score: 15, charCount: 0, sentences: 0 };
  }

  // Length: target 150-400 chars
  if (charCount < 90) {
    issues.push({
      level: "error",
      area: "description",
      message: `Description is only ${charCount} chars. Target 150-400 so subject, motion, and use case all fit.`,
    });
    score -= 25;
  } else if (charCount < 150) {
    issues.push({
      level: "warning",
      area: "description",
      message: `Description is ${charCount} chars. Aim for 150-400 so buyers get subject, motion, and context.`,
    });
    score -= 12;
  } else if (charCount <= 400) {
    strengths.push("Description length is healthy for stock marketplace scanning.");
  } else if (charCount > 600) {
    issues.push({
      level: "warning",
      area: "description",
      message: `Description is ${charCount} chars — several platforms truncate beyond 500. Tighten it.`,
    });
    score -= 10;
  }

  // Sentence count
  if (sentences < 2 && charCount >= 90) {
    issues.push({
      level: "warning",
      area: "description",
      message: "Description is only one sentence. Add a second sentence mentioning an ideal use case.",
    });
    score -= 10;
    suggestions.push("Add a use-case sentence: \"Ideal for travel ads, documentaries, or tourism campaigns.\"");
  } else if (sentences >= 2) {
    strengths.push("Description has multiple sentences, which helps buyers scan subject + use case.");
  }

  // Generic stock opener
  if (/^(aerial view|aerial footage|drone footage|drone shot|video of|footage of|a video of|a clip of)\b/i.test(trimmed)) {
    issues.push({
      level: "warning",
      area: "description",
      message: "Description starts with a generic stock phrase. Lead with the actual subject or action instead.",
    });
    score -= 15;
  }

  // Missing use-case language
  const hasUseCase = /\b(ideal for|perfect for|great for|suitable for|well suited|works well for|use case|designed for)\b/i.test(trimmed);
  if (!hasUseCase) {
    issues.push({
      level: "tip",
      area: "description",
      message: "Description doesn't mention a buyer use case. Adding \"ideal for…\" or \"perfect for…\" helps conversion.",
    });
    score -= 8;
  } else {
    strengths.push("Description calls out a concrete buyer use case.");
  }

  // Keyword-stuffing heuristic: if description has >6 commas and low sentence count, it smells like a keyword list
  const commaCount = (trimmed.match(/,/g) || []).length;
  if (commaCount > 8 && sentences < 2) {
    issues.push({
      level: "error",
      area: "description",
      message: "Description looks like a comma-separated keyword dump rather than natural prose. Rewrite as sentences.",
    });
    score -= 15;
  }

  // Title reinforcement
  const descWords = new Set(splitWords(trimmed));
  const titleWords = splitWords(title).filter((word) => word.length > 3);
  const overlap = titleWords.filter((word) => descWords.has(word)).length;
  if (titleWords.length > 0 && overlap === 0) {
    issues.push({
      level: "tip",
      area: "description",
      message: "Description doesn't reinforce the title. Repeat the core subject once so search relevance stays aligned.",
    });
    score -= 6;
  }

  // Missing motion/environment cue
  if (!DESCRIPTION_CUE_REGEX.test(trimmed)) {
    issues.push({
      level: "tip",
      area: "description",
      message: "Add one motion, environment, or buyer-intent cue so the description feels more searchable.",
    });
    score -= 5;
  }

  return { score: clamp(score), charCount, sentences };
}

function scoreKeywordCount(
  keywords: string[],
  platform: GraderPlatform,
  issues: GraderIssue[],
  strengths: string[],
  suggestions: string[],
) {
  let score = 100;
  const [idealMin, idealMax] = PLATFORM_KEYWORD_RANGES[platform];
  const count = keywords.length;
  const platformName = PLATFORM_DISPLAY_NAMES[platform];

  if (count === 0) {
    issues.push({
      level: "error",
      area: "keywords",
      message: "No keywords provided. Keywords drive almost all stock search traffic.",
    });
    return { score: 0 };
  }

  if (count < idealMin) {
    const gap = idealMin - count;
    const penalty = gap <= 5 ? 15 : gap <= 15 ? 35 : 55;
    issues.push({
      level: gap <= 5 ? "warning" : "error",
      area: "keywords",
      message: `Only ${count} keywords for ${platformName}. Target ${idealMin}-${idealMax} — you're ${gap} short.`,
    });
    score -= penalty;
    suggestions.push(`Add ${gap}+ more keywords covering subject variants, mood, time of day, and technical descriptors.`);
  } else if (count <= idealMax) {
    strengths.push(`Keyword count (${count}) is in the ${idealMin}-${idealMax} target range for ${platformName}.`);
  } else {
    const over = count - idealMax;
    issues.push({
      level: over > 10 ? "warning" : "tip",
      area: "keywords",
      message: `${count} keywords — ${platformName}'s ceiling is about ${idealMax}. Cut the weakest ${over} so the strong ones get credit.`,
    });
    score -= Math.min(25, over * 2);
  }

  return { score: clamp(score) };
}

function scoreKeywordUniqueness(
  keywords: string[],
  title: string,
  issues: GraderIssue[],
  strengths: string[],
) {
  let score = 100;
  if (keywords.length === 0) return { score: 0, duplicateCount: 0, nearDuplicateCount: 0, titleEchoedCount: 0 };

  // Exact duplicates
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const keyword of keywords) {
    if (seen.has(keyword)) duplicates.push(keyword);
    seen.add(keyword);
  }
  if (duplicates.length > 0) {
    issues.push({
      level: "error",
      area: "uniqueness",
      message: `Exact duplicates found: ${[...new Set(duplicates)].join(", ")}. Each duplicate wastes a slot.`,
      examples: [...new Set(duplicates)],
    });
    score -= Math.min(30, duplicates.length * 8);
  }

  // Singular/plural and root-word near-duplicates
  const rootGroups = new Map<string, string[]>();
  for (const keyword of keywords) {
    const parts = keyword.split(/\s+/);
    const main = parts.sort((a, b) => b.length - a.length)[0] ?? keyword;
    const root = getRoot(main);
    if (!rootGroups.has(root)) rootGroups.set(root, []);
    rootGroups.get(root)?.push(keyword);
  }
  const nearDuplicateGroups = [...rootGroups.values()].filter((group) => group.length >= 2 && new Set(group).size >= 2);
  const nearDuplicateCount = nearDuplicateGroups.reduce((sum, group) => sum + group.length - 1, 0);
  if (nearDuplicateGroups.length >= 2) {
    issues.push({
      level: "warning",
      area: "uniqueness",
      message: "Near-duplicate clusters found (e.g. singular/plural or same root). Keep the strongest form of each and cut the rest.",
      examples: nearDuplicateGroups[0],
    });
    score -= Math.min(20, nearDuplicateGroups.length * 5);
  }

  // Keywords that just echo the title (title already carries that weight)
  const titleWords = new Set(splitWords(title).filter((w) => w.length > 3));
  const titleEchoed = keywords.filter((k) => {
    const parts = splitWords(k);
    return parts.length === 1 && titleWords.has(parts[0]);
  });
  if (titleEchoed.length >= 4) {
    issues.push({
      level: "warning",
      area: "uniqueness",
      message: `${titleEchoed.length} keywords are single words already in the title. Use the keyword slots for variants and synonyms instead.`,
      examples: titleEchoed.slice(0, 6),
    });
    score -= Math.min(15, (titleEchoed.length - 3) * 3);
  }

  if (duplicates.length === 0 && nearDuplicateGroups.length < 2 && titleEchoed.length < 4) {
    strengths.push("Keyword list has strong uniqueness — no major duplicates or title echoes.");
  }

  return {
    score: clamp(score),
    duplicateCount: duplicates.length,
    nearDuplicateCount,
    titleEchoedCount: titleEchoed.length,
  };
}

function scoreKeywordSpecificity(
  keywords: string[],
  issues: GraderIssue[],
  strengths: string[],
  suggestions: string[],
) {
  let score = 100;
  if (keywords.length === 0) return { score: 0, fillerCount: 0, specificCount: 0 };

  const filler = keywords.filter((k) => FILLER_KEYWORDS.has(k));
  const specific = keywords.filter((k) => {
    const lower = k.toLowerCase();
    return (
      SPECIFIC_DESCRIPTORS.has(lower) ||
      [...SPECIFIC_DESCRIPTORS].some((d) => lower.includes(d))
    );
  });

  if (filler.length > 0) {
    const unique = [...new Set(filler)];
    issues.push({
      level: "error",
      area: "specificity",
      message: `Filler keywords wasting slots: ${unique.join(", ")}. These are overused and don't help search.`,
      examples: unique,
    });
    score -= Math.min(35, filler.length * 6);
  } else {
    strengths.push("Keyword list avoids the most obvious marketplace filler.");
  }

  const hasMood = keywords.some((k) =>
    ["serene", "peaceful", "dramatic", "tranquil", "cinematic", "calm", "moody", "vibrant", "energetic", "majestic"].includes(k),
  );
  const hasTechnical = keywords.some((k) => SPECIFIC_DESCRIPTORS.has(k));

  if (!hasMood) {
    issues.push({
      level: "tip",
      area: "specificity",
      message: "Add 1-3 mood keywords like serene, dramatic, cinematic, or calm.",
    });
    score -= 6;
  }
  if (!hasTechnical) {
    issues.push({
      level: "tip",
      area: "specificity",
      message: "Add 1-2 technical keywords like 4K, timelapse, slow motion, golden hour, or handheld — if accurate.",
    });
    score -= 6;
  } else {
    strengths.push(`Keywords include specific descriptors (${specific.slice(0, 3).join(", ")}).`);
  }

  if (specific.length < 2) {
    suggestions.push("Add more specific descriptors (timelapse, aerial, handheld, 4K, golden hour, slow-motion) — they're the keywords buyers actually search.");
  }

  return { score: clamp(score), fillerCount: filler.length, specificCount: specific.length };
}

function scoreSeoOrdering(
  keywords: string[],
  issues: GraderIssue[],
  strengths: string[],
  suggestions: string[],
) {
  let score = 100;
  if (keywords.length === 0) return { score: 0 };

  // First 3-5 keywords should be most specific / important
  const firstFive = keywords.slice(0, 5);
  const weakLeaders = firstFive.filter((k) => WEAK_FIRST_KEYWORDS.has(k));
  const fillerLeaders = firstFive.filter((k) => FILLER_KEYWORDS.has(k));

  if (fillerLeaders.length > 0) {
    issues.push({
      level: "error",
      area: "seo",
      message: `First keywords include filler: ${fillerLeaders.join(", ")}. The first 3-5 slots are prime search real estate.`,
    });
    score -= Math.min(25, fillerLeaders.length * 10);
  }

  if (weakLeaders.length >= 2) {
    issues.push({
      level: "warning",
      area: "seo",
      message: `Your early keywords are too generic (${weakLeaders.join(", ")}). Front-load the most specific subject or location terms.`,
    });
    score -= 12;
    suggestions.push("Reorder keywords so the most specific terms (subject, location, notable descriptor) come first.");
  } else if (fillerLeaders.length === 0 && firstFive.length >= 3) {
    strengths.push("First 5 keywords are specific — strong positioning for search.");
  }

  // Long-tail variation — reward having multi-word phrases
  const multiWord = keywords.filter((k) => k.split(/\s+/).length >= 2);
  const multiWordRatio = multiWord.length / keywords.length;
  if (multiWordRatio < 0.1 && keywords.length >= 10) {
    issues.push({
      level: "tip",
      area: "seo",
      message: "No long-tail keyword phrases. Add 3-5 multi-word combinations (e.g. \"golden hour sunset\", \"aerial coastline view\") for niche search traffic.",
    });
    score -= 8;
  } else if (multiWordRatio >= 0.2) {
    strengths.push("Good mix of single words and long-tail phrases for broad + niche search coverage.");
  }

  // Single-word-only keyword list is suspicious for platforms other than Pond5/Shutterstock
  if (keywords.length >= 15 && multiWord.length === 0) {
    issues.push({
      level: "warning",
      area: "seo",
      message: "Keyword list is 100% single words. Mixing in phrases captures buyers who search specifically.",
    });
    score -= 6;
  }

  return { score: clamp(score) };
}

export function gradeStockFootageMetadata(input: {
  title: string;
  description: string;
  keywords: string;
  platform?: GraderPlatform;
}): GraderResult {
  const platform: GraderPlatform = input.platform ?? "blackbox";
  const issues: GraderIssue[] = [];
  const strengths: string[] = [];
  const suggestions: string[] = [];

  const keywords = parseKeywords(input.keywords);

  const title = scoreTitle(input.title, issues, strengths, suggestions);
  const description = scoreDescription(input.description, input.title, issues, strengths, suggestions);
  const keywordCount = scoreKeywordCount(keywords, platform, issues, strengths, suggestions);
  const uniqueness = scoreKeywordUniqueness(keywords, input.title, issues, strengths);
  const specificity = scoreKeywordSpecificity(keywords, issues, strengths, suggestions);
  const seo = scoreSeoOrdering(keywords, issues, strengths, suggestions);

  // Weights: 20/20/15/15/15/15 = 100
  const overall = clamp(
    Math.round(
      title.score * 0.2 +
        description.score * 0.2 +
        keywordCount.score * 0.15 +
        uniqueness.score * 0.15 +
        specificity.score * 0.15 +
        seo.score * 0.15,
    ),
  );

  if (overall < 75) {
    issues.unshift({
      level: overall < 50 ? "error" : "warning",
      area: "overall",
      message:
        overall < 50
          ? "This metadata is underperforming against the 1,000-clip benchmark. Tighten specificity and cut filler before publishing."
          : "This draft has real weak spots. Fix the title and keyword ordering first for the fastest lift.",
    });
  } else {
    strengths.unshift("This draft is directionally solid and can compete after a light polish.");
  }

  return {
    breakdown: {
      title: title.score,
      description: description.score,
      keywords: keywordCount.score,
      uniqueness: uniqueness.score,
      specificity: specificity.score,
      seo: seo.score,
      overall,
      grade: gradeFromScore(overall),
    },
    issues,
    strengths: [...new Set(strengths)].slice(0, 6),
    suggestions: [...new Set(suggestions)].slice(0, 6),
    stats: {
      titleChars: title.charCount,
      titleWords: title.wordCount,
      descriptionChars: description.charCount,
      descriptionSentences: description.sentences,
      keywordCount: keywords.length,
      fillerKeywords: specificity.fillerCount,
      duplicateKeywords: uniqueness.duplicateCount,
      nearDuplicateKeywords: uniqueness.nearDuplicateCount,
      titleEchoedInKeywords: uniqueness.titleEchoedCount,
      specificKeywords: specificity.specificCount,
      idealKeywordRange: PLATFORM_KEYWORD_RANGES[platform],
    },
    benchmarks: BENCHMARKS,
    platform,
  };
}
