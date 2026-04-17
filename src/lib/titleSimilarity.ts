/**
 * Title similarity utilities for batch-aware metadata diversity.
 *
 * Purpose: stock platforms penalize batches where titles share the same
 * template ("Lone Skier...", "Solo Hiker...", "Solitary Climber..."). The
 * existing word-level dedup (overused adjectives, keyword roots) doesn't
 * catch *template*-level similarity.
 *
 * These functions are pure and side-effect free so they can be unit-tested
 * against real clashing title clusters (e.g. the Helton Gudauri batch).
 */

// Words we treat as grammatical filler when computing openings / bigrams.
// Kept small on purpose — these are *structural* words, not content.
const STOPWORDS = new Set([
  "a", "an", "the", "of", "and", "or", "in", "on", "at", "to", "for",
  "with", "by", "from", "into", "over", "under", "near", "along",
  "through", "across", "against", "around", "above", "below",
]);

// Common "subject" words at the start of a stock-footage title that share a
// semantic slot. If two titles both start with any of these, they share the
// same opening pattern regardless of exact wording — which is exactly the
// clash this module exists to catch.
const SUBJECT_SYNONYM_GROUPS: string[][] = [
  ["lone", "solo", "solitary", "single", "alone", "sole", "one"],
  ["skier", "climber", "hiker", "mountaineer", "traveler", "adventurer", "figure", "person", "man", "woman"],
  ["ascending", "climbing", "hiking", "traversing", "scaling", "ascends", "climbs", "hikes", "traverses"],
  ["descending", "descends"],
  ["snowy", "snow-covered", "icy", "frosty", "wintry", "winter"],
  ["steep", "rugged", "sheer", "precipitous"],
  ["mountain", "peak", "ridge", "slope", "summit", "mountainside"],
  ["dramatic", "stunning", "breathtaking", "majestic", "epic", "striking"],
  ["serene", "tranquil", "peaceful", "calm", "quiet", "still"],
  ["aerial", "drone", "overhead"],
];

const SUBJECT_SLOT_INDEX: Map<string, number> = (() => {
  const m = new Map<string, number>();
  SUBJECT_SYNONYM_GROUPS.forEach((group, i) => {
    for (const w of group) m.set(w, i);
  });
  return m;
})();

function normalize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function contentWords(title: string): string[] {
  return normalize(title).filter((w) => !STOPWORDS.has(w));
}

/**
 * The first 2 content words (stopwords skipped). Used as the "opening
 * construction" signature — e.g. "Lone Skier", "Solo Hiker" both produce
 * a 2-slot opener we can compare semantically.
 */
export function extractOpening(title: string): string[] {
  return contentWords(title).slice(0, 2);
}

/**
 * Semantic opener signature. Each word maps to its synonym-group index if
 * present, otherwise the literal word. So "Lone Skier" and "Solo Hiker"
 * both collapse to the pair [group-0, group-1] and compare equal.
 */
function openingSignature(title: string): string[] {
  return extractOpening(title).map((w) => {
    const g = SUBJECT_SLOT_INDEX.get(w);
    return g !== undefined ? `g${g}` : w;
  });
}

function openingScore(a: string, b: string): number {
  const sigA = openingSignature(a);
  const sigB = openingSignature(b);
  if (sigA.length === 0 || sigB.length === 0) return 0;
  // Both slots match -> full score. One slot matches -> half. None -> zero.
  let matches = 0;
  const len = Math.min(sigA.length, sigB.length);
  for (let i = 0; i < len; i++) if (sigA[i] === sigB[i]) matches++;
  return matches / Math.max(sigA.length, sigB.length);
}

/**
 * Bigram overlap on content words (stopwords dropped). Returns a Jaccard
 * coefficient over the bigram sets — symmetric, bounded [0,1].
 */
export function bigramOverlap(a: string, b: string): number {
  const wordsA = contentWords(a);
  const wordsB = contentWords(b);
  if (wordsA.length < 2 || wordsB.length < 2) return 0;
  const bigramsA = new Set<string>();
  const bigramsB = new Set<string>();
  for (let i = 0; i < wordsA.length - 1; i++) bigramsA.add(`${wordsA[i]} ${wordsA[i + 1]}`);
  for (let i = 0; i < wordsB.length - 1; i++) bigramsB.add(`${wordsB[i]} ${wordsB[i + 1]}`);
  let shared = 0;
  for (const bg of bigramsA) if (bigramsB.has(bg)) shared++;
  const union = bigramsA.size + bigramsB.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * Coarse template pattern: compress each word to its semantic slot (or a
 * part-of-speech-ish tag derived by regex). Two titles sharing the same
 * compressed pattern are templatically identical even if every word differs.
 */
export function extractTemplate(title: string): string {
  const words = normalize(title);
  const tokens: string[] = [];
  for (const w of words) {
    if (STOPWORDS.has(w)) {
      tokens.push(w); // keep structure words verbatim
      continue;
    }
    const g = SUBJECT_SLOT_INDEX.get(w);
    if (g !== undefined) {
      tokens.push(`G${g}`);
      continue;
    }
    // Lightweight POS-ish tagging by suffix.
    if (/ing$/.test(w)) tokens.push("VBG");
    else if (/ed$/.test(w)) tokens.push("VBD");
    else if (/ly$/.test(w)) tokens.push("RB");
    else if (/y$/.test(w) && w.length > 3) tokens.push("JJ"); // snowy, rocky, windy
    else tokens.push("NN");
  }
  return tokens.join(" ");
}

/**
 * Normalized edit-distance-ish score over template tokens. We walk both
 * token sequences and count matches at the same index, scaled by max length.
 */
function templateScore(a: string, b: string): number {
  const tokA = extractTemplate(a).split(" ");
  const tokB = extractTemplate(b).split(" ");
  if (tokA.length === 0 || tokB.length === 0) return 0;
  const len = Math.min(tokA.length, tokB.length);
  const maxLen = Math.max(tokA.length, tokB.length);
  let matches = 0;
  for (let i = 0; i < len; i++) if (tokA[i] === tokB[i]) matches++;
  return matches / maxLen;
}

/**
 * Trailing content words (up to 3). Captures the "...in Gudauri" suffix clash.
 */
export function extractSuffix(title: string, n = 3): string[] {
  const words = contentWords(title);
  return words.slice(Math.max(0, words.length - n));
}

function suffixScore(a: string, b: string): number {
  const sufA = extractSuffix(a);
  const sufB = extractSuffix(b);
  if (sufA.length === 0 || sufB.length === 0) return 0;
  let matches = 0;
  const len = Math.min(sufA.length, sufB.length);
  for (let i = 1; i <= len; i++) {
    if (sufA[sufA.length - i] === sufB[sufB.length - i]) matches++;
    else break; // only count a contiguous tail match
  }
  return matches / Math.max(sufA.length, sufB.length);
}

/**
 * Composite similarity in [0, 1].
 *
 * Weights (sum = 1.0):
 *   opening  0.35  — "Lone Skier" vs "Solo Hiker" must flag hard
 *   bigram   0.25  — shared word pairs across the whole title
 *   template 0.25  — same POS/slot pattern = same formula
 *   suffix   0.15  — "...in Gudauri" repeat
 */
export function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return 1;
  return (
    openingScore(a, b) * 0.35 +
    bigramOverlap(a, b) * 0.25 +
    templateScore(a, b) * 0.25 +
    suffixScore(a, b) * 0.15
  );
}

export type SimilarityClash = {
  existingTitle: string;
  score: number;
  opening: number;
  bigram: number;
  template: number;
  suffix: number;
};

/**
 * Returns the highest-scoring existing title (if any) that exceeds the
 * threshold. Also includes per-component scores so callers can log why.
 */
export function findWorstClash(
  candidate: string,
  existingTitles: string[],
  threshold = 0.6
): SimilarityClash | null {
  let worst: SimilarityClash | null = null;
  for (const existing of existingTitles) {
    const opening = openingScore(candidate, existing);
    const bigram = bigramOverlap(candidate, existing);
    const template = templateScore(candidate, existing);
    const suffix = suffixScore(candidate, existing);
    const score = opening * 0.35 + bigram * 0.25 + template * 0.25 + suffix * 0.15;
    if (score >= threshold && (!worst || score > worst.score)) {
      worst = { existingTitle: existing, score, opening, bigram, template, suffix };
    }
  }
  return worst;
}

/**
 * Count how many existing titles end in the same final content word
 * (e.g. "...Gudauri"). Used to tell the AI to de-emphasize the location
 * suffix when it's becoming a crutch.
 */
export function repeatedSuffixWord(existingTitles: string[]): string | null {
  if (existingTitles.length < 2) return null;
  const counts = new Map<string, number>();
  for (const t of existingTitles) {
    const suffix = extractSuffix(t, 1);
    const last = suffix[0];
    if (!last) continue;
    counts.set(last, (counts.get(last) ?? 0) + 1);
  }
  let winner: string | null = null;
  let max = 0;
  for (const [w, c] of counts) {
    if (c > max) {
      max = c;
      winner = w;
    }
  }
  return max >= 2 ? winner : null;
}

/**
 * Build the Layer-1 diversity directive to append to the system prompt.
 * Returns "" if there's nothing useful to say yet (empty batch).
 */
export function buildDiversityDirective(existingTitles: string[]): string {
  if (existingTitles.length === 0) return "";

  // Banned openings (2-word content opener from each existing title).
  const bannedOpenings = Array.from(
    new Set(
      existingTitles
        .map((t) => extractOpening(t).join(" "))
        .filter((o) => o.length > 0)
    )
  );

  const locationCrutch = repeatedSuffixWord(existingTitles);

  const lines: string[] = [];
  lines.push("");
  lines.push("⚡ BATCH STRUCTURAL DIVERSITY — NON-NEGOTIABLE");
  lines.push(
    "The previous titles in this batch have already used specific opening constructions and sentence templates. For THIS clip, your title MUST open differently AND follow a different structural template."
  );
  lines.push("");
  lines.push(`Banned openings (already used in this batch — do NOT start your title with any of these, or close synonyms):`);
  lines.push(bannedOpenings.map((o) => `  - "${o}..."`).join("\n"));
  lines.push("");
  lines.push("For THIS clip, lead with a DIFFERENT angle. Pick one axis to differentiate on:");
  lines.push("  - Time of day (dawn, twilight, golden hour, dusk, blue hour, midday)");
  lines.push("  - Weather / atmosphere (overcast, windswept, misty, still air, falling snow)");
  lines.push("  - Camera angle / movement (aerial, tracking, wide shot, close push-in, pull-back reveal)");
  lines.push("  - Environmental condition (steep, rugged, remote, exposed, sheltered)");
  lines.push("  - Emotion / mood (contemplative, urgent, determined, playful, tense)");
  lines.push("  - Subject-emphasis inversion — if prior titles led with the subject, lead with the SETTING this time (and vice versa)");
  lines.push("");
  lines.push("Vary title LENGTH too: if the prior titles are all 60-80 chars, write a 100-120 char one (or the reverse). Mix lengths across the batch.");

  if (locationCrutch) {
    lines.push("");
    lines.push(
      `LOCATION-SUFFIX CRUTCH WARNING: At least 2 prior titles end with the word "${locationCrutch}". For THIS clip, either integrate "${locationCrutch}" mid-sentence OR omit it entirely from the title (keywords + location field still carry it).`
    );
  }

  return lines.join("\n");
}

/**
 * Build the Layer-2 regeneration directive to append when the first output
 * clashed with an existing title. Calls out exactly what clashed and why.
 */
export function buildRegenDirective(clash: SimilarityClash, attempt: number): string {
  const reasons: string[] = [];
  if (clash.opening >= 0.5) reasons.push("the same opening construction");
  if (clash.bigram >= 0.3) reasons.push("overlapping word pairs");
  if (clash.template >= 0.5) reasons.push("an identical sentence template");
  if (clash.suffix >= 0.5) reasons.push("the same trailing phrase");
  const reasonText = reasons.length > 0 ? reasons.join(", ") : "overall structural similarity";

  return [
    "",
    `⚡ RETRY #${attempt} — YOUR PREVIOUS TITLE WAS TOO SIMILAR`,
    `Your previous attempt clashed with an earlier clip in this batch because of ${reasonText}.`,
    `Clashing earlier title: "${clash.existingTitle}"`,
    `Rewrite the title using a COMPLETELY DIFFERENT structure. Do NOT share opening words, do NOT reuse the template, do NOT end the same way.`,
    `Think of this as the 8th title in a series of 50 — variety is non-negotiable. Lead with a different axis: time of day, weather, camera movement, mood, or setting-first inversion.`,
    `Keep everything else (description, keywords, category) appropriate to the clip — this retry is about the TITLE only.`,
  ].join("\n");
}
