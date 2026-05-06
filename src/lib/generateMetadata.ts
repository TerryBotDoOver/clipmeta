import OpenAI from "openai";
import { Platform, GenerationSettings, PLATFORM_LABELS } from "@/lib/platform-presets";
import {
  buildDiversityDirective,
  buildRegenDirective,
  findWorstClash,
  type SimilarityClash,
} from "@/lib/titleSimilarity";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry with exponential backoff — handles 429 rate limit errors gracefully
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.toLowerCase().includes("rate limit") ||
          (err as { status?: number }).status === 429);

      if (isRateLimit && attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s
        console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retry attempts exceeded");
}

const MODEL = "gpt-4o"; // Flagship vision model — best scene/frame understanding

export type ClipMetadata = {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  location: string | null;
  confidence: "high" | "medium" | "low";
  editorial_caption: string;
};

type GenerateMetadataInput = {
  filename: string;
  frames: string[]; // base64 data URLs (jpeg)
  projectName?: string;
  platform?: Platform;
  settings?: GenerationSettings;
  existingTitles?: string[]; // titles already generated in this batch — must not repeat
  existingDescriptions?: string[]; // descriptions already generated — avoid same adjectives
};

const BASE_SYSTEM_PROMPT = `You are an elite stock footage metadata specialist. Your job is to maximize discoverability and sales on stock platforms.

Write metadata the way BUYERS search — not the way photographers describe. Buyers search for concepts, emotions, use cases, and technical qualities.

⚡ TITLE RULES
- VARY your sentence structure. Do NOT always start with "Aerial View of" or "Drone Shot of". Mix it up:
  ✓ "Akaka Falls Plunging Through Dense Tropical Rainforest in Hawaii"
  ✓ "Lush Green Valley Stretching Below a Cascading Hawaiian Waterfall"
  ✓ "Towering Waterfall Hidden Deep in Jungle Gorge — Big Island Hawaii"
  ✓ "Close-Up of Ripe Avocados at Organic Farmers Market"
  ✗ AVOID: "Aerial View of [Subject] [Verb] [Adjective] [Setting]" over and over
- Lead with the most compelling visual element — sometimes that's the subject, sometimes the mood, sometimes the setting.
- Include mood or lighting if notable (golden hour, dramatic, serene).
- No clickbait. No ALL CAPS. No "Stock Footage" in title.
- Stay within the character limit specified in platform instructions.
- TITLE ADJECTIVE VARIETY: These adjectives are BANNED from titles because they are overused across batches: "Expansive", "Sweeping", "Scenic", "Serene", "Stunning", "Breathtaking", "Panoramic". Instead use concrete descriptors: "Wide", "Quiet", "Sunlit", "Empty", "Busy", "Colorful", "Warm", "Still", "Open".

⚡ DESCRIPTION RULES
- Describe what is visually happening, the mood, and 1-2 specific use cases.
- NEVER start the description with "Aerial view", "Aerial footage", "Drone footage", "Drone shot", "Overhead view", "Bird's eye", or any variation of those phrases. Start with the SUBJECT or ACTION instead.
  ✓ "Twin bridges span the Caloosahatchee River..."
  ✓ "A sailboat glides beneath a towering bridge..."
  ✓ "Rippling water catches sunlight along the riverbank..."
  ✗ WRONG: "Aerial view of a bridge over..."
  ✗ WRONG: "Drone footage of the marina..."
- Stay within the character limit specified in platform instructions.
- Write naturally — avoid purple prose and thesaurus words.
- Each clip in a batch should have a UNIQUE description. Do not reuse sentence structure or phrases from other clips.
- VARY the use case suggestions. Do NOT use "Ideal for..." on every clip. Mix formats:
  ✓ "Perfect for real estate marketing or travel blogs."
  ✓ "Works well as an establishing shot for documentaries."
  ✓ "A strong opener for tourism campaigns."
  ✓ (Or skip the use case entirely and let the description speak for itself.)
- BANNED DESCRIPTION WORDS (overused): "showcasing", "tranquil", "serene", "expansive", "pristine", "idyllic", "picturesque". Use plain language instead: "quiet", "wide", "clean", "bright", "open", "still", "warm".

⚡ KEYWORD RULES (CRITICAL)
Order matters — strongest first. Use words BUYERS actually type into search bars.

STRICT COUNT: Generate EXACTLY the overcount number specified in the platform instructions — NOT the final target count. Post-processing will remove near-duplicates and trim to the final target. Count them before submitting. This is the single most important rule.

Structure your keywords in this priority order — but STOP once you reach the count limit:
1. UNIQUE SUBJECTS (5–8): The specific subjects ONLY visible in THIS clip. What makes this clip different from others in the same batch? Lead with these. "twin bridges", "sailboat", "dock pilings", "red rooftops"
2. SPECIFIC LOCATION (2–4): Named location first, then broader. "caloosahatchee river", "fort myers", "florida", "usa" — but ONLY include the named location if it's truly identifiable in THIS clip specifically.
3. ACTIONS & MOTION (2–4): What is visually happening. "flowing", "cascading", "traffic flowing", "sailing"
4. MOOD & EMOTION (2–3): Common buyer search words. "peaceful", "calm", "dramatic". AVOID obscure words nobody searches: "verdant", "majestic", "ethereal", "resplendent"
5. ENVIRONMENT (2–3): "coastal", "urban", "waterfront", "riverside" — pick what's SPECIFIC to this clip
6. TECHNICAL (1 ONLY): Pick exactly ONE from "drone", "aerial", or "overhead". Never use more than one camera-angle keyword per clip. Do NOT include "aerial perspective", "aerial photography", "drone perspective" as separate keywords — these waste slots.
7. LIGHTING (1): "daytime", "golden hour", "sunlit", "overcast" — pick ONE.
8. COLORS (1–2): Only truly dominant/distinctive colors. "deep blue", "lush green". Skip if colors are generic.
9. BUYER INTENT (1–2): MAXIMUM 2 total from: "b-roll", "establishing shot". BANNED entirely: "stock footage", "youtube intro", "website hero", "background video", "commercial use", "travel commercial", "tourism ad", "nature documentary", "intro footage", "wide shot", "aerial perspective", "aerial photography", "drone perspective".
10. CONCEPTUAL (1–2): Only if slots remain and they're SPECIFIC to this clip. "maritime", "urban development", "infrastructure"

STOP at the count limit. Do not pad with generic terms. ALWAYS generate at least 40 keywords. Aim for 45-49. Do NOT submit fewer than 40.

CRITICAL KEYWORD RULES:
- DIFFERENTIATION IS EVERYTHING: If you're processing a batch of similar clips (e.g. multiple drone shots of the same bridge), EACH clip must have a meaningfully different keyword set. Focus on what is UNIQUE in this specific frame — foreground subject, specific angle, specific detail, specific movement. A batch of 10 bridge clips should each lead with a DIFFERENT primary subject.
- ZERO near-duplicates. "water", "waterway", "waters", "waterfront" are the same root — pick ONE form only. "outdoor" and "outdoors" — pick one. Before submitting, scan every keyword for shared root words and remove all but the most specific form.
- CRITICAL word repetition rule: No single root word may appear in more than 2 keywords total.
- No fillers: "video", "footage", "clip", "mp4", "file"
- Use lowercase, no punctuation in keywords (hyphens ok in compound words)
- Specific before generic ("caloosahatchee river" before "river" before "water")
- Use PLAIN language buyers type, not literary adjectives
- BANNED PHRASES AS KEYWORDS: "aerial view", "aerial shot", "aerial footage", "drone view", "drone shot", "drone footage", "birds eye view", "top down view", "wide shot", "overhead view" — use "aerial" or "drone" or "overhead" as single words only

⚡ CATEGORY RULES
Pick exactly one category from this list (MUST match exactly, case-sensitive):
Animals, Objects & Equipment, Arts & Entertainment, Beauty & Health, Business, Food, Drink, Industry, Location & Buildings, Medical, Nature, Objects & Graphics, People, Religion, Science, Sport & Fitness, Technology, Time Lapse, Transportation, Travel

Choose the category that BEST matches what is most prominent in THIS specific clip, not the batch overall. For example in a beach batch:
- Clip focused on a pier, bridge, or buildings → "Location & Buildings"
- Clip focused on water, waves, shoreline → "Nature"  
- Clip showing a full beach town/destination → "Travel"
- Clip showing people on the beach → "People"
Do NOT default to the same category for every clip in a batch. Pick what fits each clip best.

⚡ LOCATION RULES
Return the COUNTRY name (e.g. "United States", "Japan", "Costa Rica") — NOT a state or city.
ONLY include if you can identify from: recognizable landmark, distinct geography, visible text/signage, unmistakably unique landscape, or filename clues (e.g. "hawaii-drone.mp4" → "United States").
Return null if uncertain. NEVER GUESS.

⚡ CONFIDENCE RULES
high = clear, well-lit frames with obvious content
medium = some ambiguity but confident in main subject
low = dark, blurry, or heavily ambiguous frames

Return ONLY valid JSON. No extra text. No markdown code blocks.`;

export async function generateMetadata(
  input: GenerateMetadataInput
): Promise<ClipMetadata> {
  const { filename, frames, projectName, platform = "generic", settings, existingTitles = [], existingDescriptions = [] } = input;

  if (frames.length === 0) {
    throw new Error("Cannot generate accurate metadata without extracted video frames.");
  }

  const effectiveSettings: GenerationSettings = settings ?? {
    keywordCount: 35,
    titleStyle: "seo",
    descStyle: "detailed",
    includeLocation: true,
    includeCameraDetails: true,
    titleMaxChars: 200,
    descMaxChars: 300,
    keywordFormat: "mixed",
    hasDescription: true,
  };

  const hasDescription = effectiveSettings.hasDescription !== false;

  // Build platform-specific instructions
  const platformInstructions = `
⚡ PLATFORM-SPECIFIC INSTRUCTIONS
Target platform: ${PLATFORM_LABELS[platform]}
Required keywords: generate EXACTLY ${Math.ceil(effectiveSettings.keywordCount * 1.5)} keywords as a buffer - they will be filtered down to ${effectiveSettings.keywordCount} after processing. DO NOT stop early. Push to generate ALL ${Math.ceil(effectiveSettings.keywordCount * 1.5)} even for simple subjects - use synonyms, related concepts, use cases, and buyer search terms to reach the count.
Title max length: ${effectiveSettings.titleMaxChars} characters — do not exceed this
${hasDescription
  ? `Description max length: ${effectiveSettings.descMaxChars} characters — do not exceed this`
  : `NO DESCRIPTION FIELD: This platform (Adobe Stock) has no description field. Write a richer, more detailed title that packs in subject, action, mood, and location — all within ${effectiveSettings.titleMaxChars} characters. The title carries all the descriptive weight.`
}
Title style: ${
    effectiveSettings.titleStyle === "seo"
      ? "SEO-optimized (concise, searchable, lead with buyer-intent keywords)"
      : "Descriptive (natural language, scene-setting, conversational tone)"
  }
${hasDescription ? `Description style: ${
    effectiveSettings.descStyle === "concise"
      ? "Write one concise punchy sentence."
      : "Write 2–3 sentences covering subject, mood, setting, and potential use cases."
  }` : `Description: Return an empty string "" for the description field — it will not be used in the export.`}
Keyword format: ${
    effectiveSettings.keywordFormat === "single"
      ? 'SINGLE WORDS ONLY — every keyword must be exactly one word (e.g. "waterfall", "aerial", "sunset"). No spaces. No multi-word phrases whatsoever.'
      : effectiveSettings.keywordFormat === "phrases"
      ? 'PHRASES ONLY — every keyword must be two or more words (e.g. "golden hour", "aerial view", "flowing water"). No single-word keywords.'
      : "MIXED — use a natural blend of single words and multi-word phrases for maximum search coverage."
  }
${
    effectiveSettings.includeLocation
      ? "Include location/region/geography keywords where identifiable from the frames OR inferred from the clip title/filename (e.g. 'florida-beach-drone.mp4' → include Florida geography keywords)."
      : "Do NOT include specific location or geography keywords."
  }
${
    effectiveSettings.includeCameraDetails
      ? "Include relevant camera perspective keywords (aerial, drone, close-up, wide shot, handheld, tracking shot, etc.)."
      : "Focus on subject matter only — skip camera perspective details."
  }`;

  // Uniqueness instructions — critical for batch processing
  // Extract overused adjectives from existing descriptions
  const adjectiveBlacklist: string[] = [];
  if (existingDescriptions.length > 0) {
    const wordFreq: Record<string, number> = {};
    const commonWords = new Set(["a","an","the","of","and","in","with","to","at","for","on","from","by","is","are","was","were","that","this","it","its","as","into","over","near","along"]);
    for (const desc of existingDescriptions) {
      const words = desc.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && !commonWords.has(w)) {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
        }
      }
    }
    // Words used in 30%+ of existing descriptions are overused (aggressive threshold)
    const threshold = Math.max(2, Math.floor(existingDescriptions.length * 0.3));
    for (const [word, count] of Object.entries(wordFreq)) {
      if (count >= threshold) adjectiveBlacklist.push(word);
    }
  }

  const uniquenessInstructions = existingTitles.length > 0
    ? `
⚡ UNIQUENESS REQUIREMENT — THIS IS CRITICAL
This clip is part of a batch where other clips have already been processed. You MUST make this clip's metadata meaningfully different from the rest of the batch.

Already-used titles in this batch (DO NOT repeat or closely paraphrase these):
${existingTitles.map((t, i) => `  ${i + 1}. "${t}"`).join("\n")}

${adjectiveBlacklist.length > 0 ? `OVERUSED WORDS IN THIS BATCH (AVOID these — they've been used too many times already):
${adjectiveBlacklist.join(", ")}
Find FRESH alternatives. If "serene" is overused, try "quiet", "still", "undisturbed", "gentle". If "tranquil" is overused, try "placid", "restful", "unhurried". If "emerald" is overused, try "jade", "seafoam", "teal", "aquamarine". Use words that real buyers search for.` : ""}

${existingDescriptions.length > 0 ? `Recent descriptions (DO NOT repeat phrasing or structure):
${existingDescriptions.slice(0, 8).map((d, i) => `  ${i + 1}. "${d.slice(0, 80)}..."`).join("\n")}` : ""}

To achieve uniqueness:
- Focus on a different aspect of the scene (composition angle, specific subject, foreground vs background, motion vs stillness)
- Use different lead words in the title
- Vary the mood descriptors (don't just swap synonyms — find a genuinely different angle)
- Vary the keyword set — prioritize what makes THIS specific frame/moment distinct
- Even if clips look similar, there are always micro-differences in composition, light, motion, or framing — find them and lead with those`
    : "";

  // Layer 1: batch-aware structural diversity directive (banned openings,
  // differentiation axes, location-suffix warning). This is additive on top of
  // the word-level uniquenessInstructions above and targets *template* clashes
  // that word-level dedup can't see.
  const diversityDirective = buildDiversityDirective(existingTitles);

  const systemPrompt = BASE_SYSTEM_PROMPT + platformInstructions + uniquenessInstructions + diversityDirective;

  // Use up to 4 frames for cost efficiency
  const imageBlocks: OpenAI.Chat.ChatCompletionContentPart[] = frames
    .slice(0, 4)
    .map((frame) => ({
      type: "image_url" as const,
      image_url: {
        url: frame,
        detail: "low" as const,
      },
    }));

  const hasFrames = frames.length > 0;
  const frameInstruction = hasFrames
    ? `I am providing ${Math.min(frames.length, 4)} extracted frames. Analyze them together to understand the full scene, motion, mood, and content.`
    : `No frames are available (the file uses a codec the browser cannot decode, e.g. Apple ProRes). Generate the best metadata you can from the filename and project name. Infer the likely content, location, and style from these clues. Set confidence to "low".`;

  const userMessage = `Generate professional stock footage metadata for this clip.

Filename: ${filename}${projectName ? `\nProject: ${projectName}` : ""}
Platform: ${PLATFORM_LABELS[platform]}

${frameInstruction}

Return this exact JSON:
{
  "title": "string (max ${effectiveSettings.titleMaxChars} chars)",
  "description": "string (max ${effectiveSettings.descMaxChars} chars)",
  "keywords": ["string", ... exactly ${Math.ceil(effectiveSettings.keywordCount * 1.5)} keywords, strongest first],
  "category": "string (one of the allowed categories)",
  "location": "string or null",
  "confidence": "high|medium|low",
  "editorial_caption": "string — a factual, news-style caption for editorial licensing. Write ONE sentence describing exactly what is visible in THIS clip. Use present tense, no promotional language, no subjective adjectives. Focus on the factual who/what/where/when. Example: 'Aerial view of residential waterfront homes along the Caloosahatchee River with sailboats docked at private piers.' Do NOT include city/country/date in this field — those are added separately. Just describe what the viewer sees."
}`;

  // Layer 2: post-generation template-similarity check + forced regeneration.
  // We call OpenAI, parse, then compare the returned title against existingTitles.
  // If similarity to any existing title > 0.6, regenerate with a sharper directive.
  // Capped at 2 retries per clip (so max 3 total calls) to prevent cost runaway.
  const MAX_REGEN_ATTEMPTS = 2;
  let parsed: ClipMetadata | null = null;
  let lastClash: SimilarityClash | null = null;
  let regenDirective = "";
  // Nudge temperature up on retry to push the model off the same attractor.
  const baseTemperature = 0.55;

  for (let attempt = 0; attempt <= MAX_REGEN_ATTEMPTS; attempt++) {
    const attemptSystemPrompt = systemPrompt + regenDirective;
    const attemptTemperature = baseTemperature + attempt * 0.1; // 0.55, 0.65, 0.75

    let response: Awaited<ReturnType<typeof openai.chat.completions.create>>;
    try {
      response = await withRetry(() =>
        openai.chat.completions.create({
          model: MODEL,
          max_tokens: 1500,
          temperature: attemptTemperature,
          messages: [
            { role: "system", content: attemptSystemPrompt },
            {
              role: "user",
              content: [...imageBlocks, { type: "text", text: userMessage }],
            },
          ],
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status;
      console.error(`[generateMetadata] OpenAI API error — model: ${MODEL}, status: ${status}, message: ${msg}`);
      throw err;
    }

    const raw = response.choices[0]?.message?.content ?? "";

    // Strip markdown code blocks if present
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let candidate: ClipMetadata;
    try {
      candidate = JSON.parse(cleaned);
    } catch {
      throw new Error(`OpenAI returned invalid JSON: ${raw.slice(0, 200)}`);
    }

    // If there are no existing titles to clash with, accept immediately.
    if (existingTitles.length === 0) {
      parsed = candidate;
      break;
    }

    const candidateTitle = String(candidate.title ?? "");
    const clash = findWorstClash(candidateTitle, existingTitles, 0.6);

    if (!clash || attempt === MAX_REGEN_ATTEMPTS) {
      // Either clean, or we've exhausted retries — accept what we have.
      if (clash && attempt === MAX_REGEN_ATTEMPTS) {
        console.warn(
          `[generateMetadata] Accepting clashing title after ${MAX_REGEN_ATTEMPTS} retries — filename="${filename}" score=${clash.score.toFixed(
            2
          )} candidate="${candidateTitle}" clashesWith="${clash.existingTitle}"`
        );
      }
      parsed = candidate;
      lastClash = clash;
      break;
    }

    // Clash detected — log and prepare a regen directive for the next attempt.
    console.warn(
      `[generateMetadata] Title clash detected (attempt ${attempt + 1}/${MAX_REGEN_ATTEMPTS + 1}) — ` +
        `filename="${filename}" score=${clash.score.toFixed(2)} ` +
        `(opening=${clash.opening.toFixed(2)} bigram=${clash.bigram.toFixed(2)} ` +
        `template=${clash.template.toFixed(2)} suffix=${clash.suffix.toFixed(2)}) ` +
        `candidate="${candidateTitle}" clashesWith="${clash.existingTitle}"`
    );
    lastClash = clash;
    regenDirective = buildRegenDirective(clash, attempt + 1);
  }

  if (!parsed) {
    // Defensive — the loop always assigns parsed on its final iteration.
    throw new Error("generateMetadata: no parsed result after retry loop");
  }
  // Avoid unused-var warning; lastClash is retained only for the log above.
  void lastClash;

  // Sanitize keywords: deduplicate, remove fillers, split overused phrases, lowercase
  const FILLER_KEYWORDS = new Set([
    "video", "footage", "clip", "stock", "mp4", "file", "shot", "frame",
    "recording", "movie", "film", "cinema", "camera",
    // Generic filler use-case phrases — too broad to help buyers find this specific clip
    "youtube intro", "website hero", "background video", "commercial use",
    "travel commercial", "tourism ad", "nature documentary", "promotional video",
    "intro footage", "promo video", "marketing video", "social media",
    // Overused technical descriptors that apply to every drone clip
    "wide shot", "overhead view", "top-down", "top down",
    // Filler buyer-intent that every clip uses (not differentiating)
    "introduction video", "city documentary", "travel documentary",
  ]);

  // Overused generic phrases that should be split into individual words
  const SPLIT_PHRASES: Record<string, string[]> = {
    "aerial view": ["aerial"],
    "aerial shot": ["aerial"],
    "aerial footage": ["aerial"],
    "drone view": ["drone"],
    "drone shot": ["drone"],
    "drone footage": ["drone"],
    "birds eye view": ["aerial", "overhead"],
    "bird's eye view": ["aerial", "overhead"],
    "birds-eye view": ["aerial", "overhead"],
    "top down view": ["overhead", "top-down"],
    "top-down view": ["overhead", "top-down"],
    "establishing shot": ["establishing shot"], // this one is a valid buyer search term, keep it
    "stock footage": ["stock footage"], // valid buyer intent, keep it
    "b-roll": ["b-roll"], // valid buyer intent, keep it
  };

  const rawKeywords: string[] = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean)
    : [];

  // Expand split phrases, then deduplicate
  const expandedKeywords: string[] = [];
  for (const kw of rawKeywords) {
    if (SPLIT_PHRASES[kw]) {
      expandedKeywords.push(...SPLIT_PHRASES[kw]);
    } else {
      expandedKeywords.push(kw);
    }
  }

  // Near-duplicate detection: extract root word (strip trailing s, es, ing, ed, ly)
  // If a keyword shares a root with an already-accepted keyword, drop the less specific one
  const getRoot = (word: string): string => {
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
  };

  // For multi-word keywords, use the most distinctive (longest) word as the root key
  const getKeyRoot = (kw: string): string => {
    const words = kw.split(/\s+/);
    // Pick the longest word as the "root word" to compare against
    const mainWord = words.sort((a, b) => b.length - a.length)[0];
    return getRoot(mainWord);
  };

  // Track root word usage — allow a root to appear in at most 2 keywords
  const rootCount = new Map<string, number>();
  const seen = new Set<string>();
  const cleanedKeywords = expandedKeywords.filter((kw) => {
    if (FILLER_KEYWORDS.has(kw)) return false;
    if (seen.has(kw)) return false;

    const root = getKeyRoot(kw);
    const count = rootCount.get(root) ?? 0;
    // Allow up to 2 keywords sharing the same root (e.g. "river" and "riverside" both ok, but not a 3rd)
    if (count >= 2) return false;

    seen.add(kw);
    rootCount.set(root, count + 1);
    return true;
  });

  // Fix description if it starts with banned phrases — rewrite the opener
  let finalDescription = String(parsed.description ?? "").slice(0, effectiveSettings.descMaxChars);
  const BANNED_DESC_OPENERS = [
    /^aerial view of /i,
    /^aerial footage of /i,
    /^aerial shot of /i,
    /^drone footage of /i,
    /^drone shot of /i,
    /^drone view of /i,
    /^overhead view of /i,
    /^bird'?s[- ]?eye view of /i,
    /^an aerial view of /i,
    /^a drone shot of /i,
  ];
  for (const pattern of BANNED_DESC_OPENERS) {
    if (pattern.test(finalDescription)) {
      // Strip the banned opener — capitalize what's left
      finalDescription = finalDescription.replace(pattern, "");
      finalDescription = finalDescription.charAt(0).toUpperCase() + finalDescription.slice(1);
      break;
    }
  }

  // Editorial caption: factual news-style description of clip content.
  // This is pre-generated for ALL clips but only visible when user enables editorial mode.
  // The final exported caption will be assembled as: "{city}, {country} – {date}: {editorial_caption}"
  const editorialCaption = String(parsed.editorial_caption ?? "").slice(0, 300) ||
    // Fallback: derive from title if GPT didn't return an editorial_caption
    String(parsed.title ?? "").replace(/\s*\|.*$/, "").slice(0, 200);

  return {
    title: String(parsed.title ?? "").slice(0, effectiveSettings.titleMaxChars),
    description: finalDescription,
    keywords: cleanedKeywords.slice(0, effectiveSettings.keywordCount),
    category: String(parsed.category ?? "Nature"),
    location: (parsed.location && String(parsed.location).toLowerCase() !== "null") ? String(parsed.location) : null,
    confidence: ["high", "medium", "low"].includes(parsed.confidence)
      ? (parsed.confidence as ClipMetadata["confidence"])
      : "medium",
    editorial_caption: editorialCaption,
  };
}
