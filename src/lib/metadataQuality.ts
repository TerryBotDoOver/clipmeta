/**
 * Metadata quality scoring and warnings for stock footage.
 * Helps contributors catch weak metadata before exporting.
 */

export type QualityWarning = {
  level: "error" | "warning" | "tip";
  message: string;
};

export type QualityScore = {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  warnings: QualityWarning[];
};

const WEAK_FIRST_KEYWORDS = new Set([
  "nature", "water", "sky", "outdoor", "outdoors", "background", "beautiful",
  "scene", "view", "light", "color", "colours", "colors", "image", "photo",
  "landscape", "environment",
]);

const FILLER_KEYWORDS = new Set([
  "video", "footage", "clip", "stock", "mp4", "file", "shot", "frame",
  "recording", "movie", "film", "cinema",
]);

export function scoreMetadata(meta: {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  location: string | null;
}): QualityScore {
  const warnings: QualityWarning[] = [];
  let score = 100;

  // ── Title checks ──
  const titleWords = meta.title.trim().split(/\s+/).filter(Boolean);
  if (titleWords.length < 6) {
    warnings.push({ level: "error", message: "Title is too short — aim for 8-15 words." });
    score -= 15;
  } else if (titleWords.length < 8) {
    warnings.push({ level: "warning", message: "Title could be more descriptive (8+ words recommended)." });
    score -= 5;
  }
  if (meta.title.toLowerCase().includes("stock") || meta.title.toLowerCase().includes("footage")) {
    warnings.push({ level: "error", message: 'Title contains "stock" or "footage" — remove these.' });
    score -= 10;
  }

  // ── Description checks ──
  if (!meta.description || meta.description.length < 60) {
    warnings.push({ level: "warning", message: "Description is too short — aim for 100-200 characters." });
    score -= 10;
  }

  // ── Keyword count checks ──
  const kws = meta.keywords;
  if (kws.length < 20) {
    warnings.push({ level: "error", message: `Only ${kws.length} keywords — add more (aim for 40-50).` });
    score -= 20;
  } else if (kws.length < 35) {
    warnings.push({ level: "warning", message: `${kws.length} keywords — more is better (aim for 40-50).` });
    score -= 10;
  } else if (kws.length >= 45) {
    // bonus for hitting the target
    score = Math.min(100, score + 5);
  }

  // ── First-keyword quality check ──
  const firstFive = kws.slice(0, 5).map((k) => k.toLowerCase());
  const weakLeaders = firstFive.filter((k) => WEAK_FIRST_KEYWORDS.has(k));
  if (weakLeaders.length >= 2) {
    warnings.push({
      level: "warning",
      message: `First keywords are too generic (${weakLeaders.join(", ")}) — move specific terms to the top.`,
    });
    score -= 10;
  }

  // ── Filler keyword check ──
  const fillers = kws.filter((k) => FILLER_KEYWORDS.has(k.toLowerCase()));
  if (fillers.length > 0) {
    warnings.push({
      level: "error",
      message: `Remove filler keywords: ${fillers.join(", ")}`,
    });
    score -= 10;
  }

  // ── Duplicate keyword check ──
  const uniqueKws = new Set(kws.map((k) => k.toLowerCase()));
  if (uniqueKws.size < kws.length) {
    warnings.push({ level: "error", message: "Duplicate keywords detected — remove them." });
    score -= 5;
  }

  // ── Category check ──
  if (!meta.category) {
    warnings.push({ level: "warning", message: "No category set." });
    score -= 5;
  }

  // ── Bonus: has location ──
  if (meta.location) {
    score = Math.min(100, score + 3);
  }

  // ── Tips ──
  const hasMood = kws.some((k) =>
    ["serene", "peaceful", "dramatic", "majestic", "vibrant", "tranquil",
     "energetic", "moody", "cinematic", "calm", "dynamic", "epic"].includes(k.toLowerCase())
  );
  if (!hasMood) {
    warnings.push({ level: "tip", message: "Add mood/emotion keywords (serene, dramatic, cinematic, etc.)" });
  }

  const hasTechnical = kws.some((k) =>
    ["4k", "drone", "aerial", "slow motion", "slow-motion", "timelapse",
     "cinematic", "wide angle", "close-up", "macro", "handheld"].includes(k.toLowerCase())
  );
  if (!hasTechnical) {
    warnings.push({ level: "tip", message: "Add technical keywords (4K, drone, slow motion, cinematic, etc.)" });
  }

  const hasUseCase = kws.some((k) =>
    ["commercial", "advertisement", "documentary", "tourism", "editorial",
     "marketing", "campaign", "social media", "corporate"].includes(k.toLowerCase())
  );
  if (!hasUseCase) {
    warnings.push({ level: "tip", message: "Add use-case keywords (commercial, documentary, tourism, etc.)" });
  }

  score = Math.max(0, Math.min(100, score));

  let grade: QualityScore["grade"];
  if (score >= 90) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 45) grade = "D";
  else grade = "F";

  return { score, grade, warnings };
}
