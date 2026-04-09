export type GraderSeverity = "error" | "warning" | "tip";

export type GraderIssue = {
  level: GraderSeverity;
  area: "title" | "description" | "keywords" | "overall";
  message: string;
  examples?: string[];
};

export type GraderBreakdown = {
  title: number;
  description: number;
  keywords: number;
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
  stats: {
    titleWords: number;
    descriptionChars: number;
    keywordCount: number;
    fillerKeywords: number;
    duplicateKeywords: number;
    nearDuplicateKeywords: number;
  };
  benchmarks: GraderBenchmarks;
};

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

function titleScore(title: string, issues: GraderIssue[], strengths: string[]) {
  let score = 100;
  const words = splitWords(title);
  const genericTerms = words.filter((word) => GENERIC_TITLE_TERMS.has(word));
  const uniqueWords = new Set(words);

  if (words.length < 5) {
    issues.push({
      level: "error",
      area: "title",
      message: `Your title is only ${words.length} words. The 1,000-clip benchmark averages ${BENCHMARKS.avgTitleWordCount.toFixed(1)} words, and strong titles usually land around 6–9.`,
    });
    score -= 28;
  } else if (words.length <= 9) {
    strengths.push("Title length is in the sweet spot for stock search readability.");
  } else if (words.length > 14) {
    issues.push({
      level: "warning",
      area: "title",
      message: "Your title is getting long. Trim filler so the most searchable subject stays obvious.",
    });
    score -= 10;
  }

  if (genericTerms.length >= 2) {
    issues.push({
      level: "error",
      area: "title",
      message: `Too much generic title language (${[...new Set(genericTerms)].join(", ")}). Real stock winners usually lead with the subject, setting, or action instead.`,
      examples: BENCHMARKS.bestExamples,
    });
    score -= 22;
  } else if (genericTerms.length === 0 && words.length >= 5) {
    strengths.push("Title avoids the most common generic stock filler terms.");
  }

  if (uniqueWords.size <= 3 || words.length - uniqueWords.size >= 2) {
    issues.push({
      level: "warning",
      area: "title",
      message: "Your title feels repetitive or too vague. Try adding one concrete subject, one setting, and one action or mood cue.",
      examples: BENCHMARKS.worstExamples,
    });
    score -= 12;
  }

  if (/^(video|footage|clip|stock)\b/i.test(title.trim())) {
    issues.push({
      level: "error",
      area: "title",
      message: 'Don\'t start the title with “video,” “footage,” or “stock.” Buyers search for the scene, not the file type.',
    });
    score -= 18;
  }

  return { score: clamp(score), wordCount: words.length };
}

function descriptionScore(description: string, title: string, issues: GraderIssue[], strengths: string[]) {
  let score = 100;
  const trimmed = description.trim();
  const charCount = trimmed.length;

  if (charCount === 0) {
    issues.push({
      level: "error",
      area: "description",
      message: "No description provided. Even a short stock description should clarify subject, action, and use case.",
    });
    return { score: 20, charCount };
  }

  if (charCount < 90) {
    issues.push({
      level: "warning",
      area: "description",
      message: "Description is thin. Aim for roughly 90–220 characters so buyers get subject, motion, and context quickly.",
    });
    score -= 22;
  } else if (charCount <= 220) {
    strengths.push("Description length is healthy for stock marketplace scanning.");
  } else if (charCount > 320) {
    issues.push({
      level: "warning",
      area: "description",
      message: "Description is getting bloated. Tighten it so the scene reads fast in platform previews.",
    });
    score -= 10;
  }

  if (/^(aerial view|aerial footage|drone footage|drone shot|video of|footage of)\b/i.test(trimmed)) {
    issues.push({
      level: "warning",
      area: "description",
      message: "Your description starts with a generic stock phrase. Lead with the actual subject or action instead.",
    });
    score -= 18;
  }

  const descWords = new Set(splitWords(trimmed));
  const titleWords = splitWords(title).filter((word) => word.length > 3);
  const overlap = titleWords.filter((word) => descWords.has(word)).length;
  if (titleWords.length > 0 && overlap === 0) {
    issues.push({
      level: "tip",
      area: "description",
      message: "Your description is not reinforcing the title. Repeat the core subject once so search relevance stays aligned.",
    });
    score -= 8;
  }

  if (!/(with|featuring|showing|capturing|gliding|moving|flowing|standing|walking|waves|sunlight|traffic|city|coast|forest|mountain)/i.test(trimmed)) {
    issues.push({
      level: "tip",
      area: "description",
      message: "Add one motion, environment, or buyer-intent cue so the description feels more searchable and useful.",
    });
    score -= 6;
  }

  return { score: clamp(score), charCount };
}

function keywordScore(keywordText: string, issues: GraderIssue[], strengths: string[]) {
  let score = 100;
  const keywords = parseKeywords(keywordText);

  if (keywords.length === 0) {
    issues.push({
      level: "error",
      area: "keywords",
      message: "No keywords provided.",
    });
    return {
      score: 0,
      count: 0,
      fillerCount: 0,
      duplicateCount: 0,
      nearDuplicateCount: 0,
    };
  }

  if (keywords.length < 20) {
    issues.push({
      level: "error",
      area: "keywords",
      message: `Only ${keywords.length} keywords. Contributors usually need 35–50 to compete across Blackbox, Adobe, Pond5, and Shutterstock.`,
    });
    score -= 28;
  } else if (keywords.length < 35) {
    issues.push({
      level: "warning",
      area: "keywords",
      message: `${keywords.length} keywords is usable, but you likely need more depth to cover subject, mood, use case, and technical terms.`,
    });
    score -= 14;
  } else if (keywords.length <= 50) {
    strengths.push("Keyword count is in the target range.");
  } else {
    issues.push({
      level: "warning",
      area: "keywords",
      message: `${keywords.length} keywords may be overstuffed. Cut weak fillers before marketplaces ignore them.`,
    });
    score -= 8;
  }

  const filler = keywords.filter((keyword) => FILLER_KEYWORDS.has(keyword));
  if (filler.length > 0) {
    issues.push({
      level: "error",
      area: "keywords",
      message: `Filler keywords are wasting slots: ${[...new Set(filler)].join(", ")}.`,
      examples: [...new Set(filler)],
    });
    score -= Math.min(22, filler.length * 5);
  } else {
    strengths.push("Keyword list avoids the most obvious marketplace filler.");
  }

  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const keyword of keywords) {
    if (seen.has(keyword)) duplicates.push(keyword);
    seen.add(keyword);
  }
  if (duplicates.length > 0) {
    issues.push({
      level: "error",
      area: "keywords",
      message: `Exact duplicates found: ${[...new Set(duplicates)].join(", ")}.`,
      examples: [...new Set(duplicates)],
    });
    score -= Math.min(15, duplicates.length * 4);
  }

  const rootGroups = new Map<string, string[]>();
  for (const keyword of keywords) {
    const parts = keyword.split(/\s+/);
    const main = parts.sort((a, b) => b.length - a.length)[0] ?? keyword;
    const root = getRoot(main);
    if (!rootGroups.has(root)) rootGroups.set(root, []);
    rootGroups.get(root)?.push(keyword);
  }
  const nearDuplicateGroups = [...rootGroups.values()].filter((group) => group.length >= 3);
  const nearDuplicateCount = nearDuplicateGroups.reduce((sum, group) => sum + group.length - 2, 0);
  if (nearDuplicateGroups.length > 0) {
    issues.push({
      level: "warning",
      area: "keywords",
      message: `Near-duplicate clusters found. Keep the strongest version and cut the rest.`,
      examples: nearDuplicateGroups[0],
    });
    score -= Math.min(15, nearDuplicateGroups.length * 5);
  }

  const firstFive = keywords.slice(0, 5);
  const weakLeaders = firstFive.filter((keyword) => WEAK_FIRST_KEYWORDS.has(keyword));
  if (weakLeaders.length >= 2) {
    issues.push({
      level: "warning",
      area: "keywords",
      message: `Your early keywords are too generic (${weakLeaders.join(", ")}). Front-load the most specific subject or location terms.`,
    });
    score -= 10;
  }

  const hasMood = keywords.some((keyword) =>
    ["serene", "peaceful", "dramatic", "tranquil", "cinematic", "calm", "moody", "vibrant"].includes(keyword),
  );
  const hasTechnical = keywords.some((keyword) =>
    ["4k", "drone", "aerial", "slow motion", "timelapse", "wide angle", "macro", "handheld"].includes(keyword),
  );
  if (hasMood) strengths.push("Keywords include at least one mood/search-intent term.");
  else {
    issues.push({
      level: "tip",
      area: "keywords",
      message: "Add 1–3 mood keywords like serene, dramatic, cinematic, or calm.",
    });
    score -= 4;
  }

  if (!hasTechnical) {
    issues.push({
      level: "tip",
      area: "keywords",
      message: "Add 1–2 technical keywords like 4k, drone, macro, or timelapse if they are truly accurate.",
    });
    score -= 4;
  }

  return {
    score: clamp(score),
    count: keywords.length,
    fillerCount: filler.length,
    duplicateCount: duplicates.length,
    nearDuplicateCount,
  };
}

export function gradeStockFootageMetadata(input: {
  title: string;
  description: string;
  keywords: string;
}): GraderResult {
  const issues: GraderIssue[] = [];
  const strengths: string[] = [];

  const title = titleScore(input.title, issues, strengths);
  const description = descriptionScore(input.description, input.title, issues, strengths);
  const keywords = keywordScore(input.keywords, issues, strengths);

  const overall = clamp(
    Math.round(title.score * 0.3 + description.score * 0.25 + keywords.score * 0.45),
  );

  if (overall < 75) {
    issues.unshift({
      level: overall < 50 ? "error" : "warning",
      area: "overall",
      message: `This metadata is underperforming against the 1,000-clip benchmark. Tighten specificity before publishing it.`,
    });
  } else {
    strengths.unshift("This draft is directionally solid and can compete after a light polish.");
  }

  return {
    breakdown: {
      title: title.score,
      description: description.score,
      keywords: keywords.score,
      overall,
      grade: gradeFromScore(overall),
    },
    issues,
    strengths: [...new Set(strengths)].slice(0, 5),
    stats: {
      titleWords: title.wordCount,
      descriptionChars: description.charCount,
      keywordCount: keywords.count,
      fillerKeywords: keywords.fillerCount,
      duplicateKeywords: keywords.duplicateCount,
      nearDuplicateKeywords: keywords.nearDuplicateCount,
    },
    benchmarks: BENCHMARKS,
  };
}
