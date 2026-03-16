import OpenAI from "openai";
import { Platform, GenerationSettings, PLATFORM_LABELS } from "@/lib/platform-presets";

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
};

type GenerateMetadataInput = {
  filename: string;
  frames: string[]; // base64 data URLs (jpeg)
  projectName?: string;
  platform?: Platform;
  settings?: GenerationSettings;
  existingTitles?: string[]; // titles already generated in this batch — must not repeat
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

⚡ DESCRIPTION RULES
- Describe what is visually happening, the mood, and 1-2 specific use cases.
- Stay within the character limit specified in platform instructions.
- Write naturally — avoid purple prose and thesaurus words.

⚡ KEYWORD RULES (CRITICAL)
Order matters — strongest first. Use words BUYERS actually type into search bars.

Structure your keywords in this priority order:
1. PRIMARY SUBJECTS (3–5): Main subjects. "waterfall", "tropical rainforest", "avocado"
2. ACTIONS & MOTION (3–5): What is happening. "flowing water", "cascading", "panning shot"
3. BUYER INTENT (4–6): What buyers search when looking for this type of footage. "b-roll", "establishing shot", "intro footage", "background video", "stock footage", "commercial use"
4. MOOD & EMOTION (3–5): How it feels. Use COMMON words buyers search — "peaceful", "calm", "dramatic", "beautiful". AVOID obscure words like "verdant", "majestic", "ethereal", "resplendent" that nobody searches for.
5. ENVIRONMENT & SETTING (4–6): Where it is. "tropical", "jungle", "outdoors", "nature", "island"
6. TECHNICAL QUALITIES (3–5): Camera/production. "4K", "drone", "aerial", "cinematic", "slow motion", "wide angle", "close up"
7. LIGHTING & TIME (2–3): "golden hour", "sunset", "daytime"
8. COLORS (2–3): Dominant colors visible. "green", "blue", "golden"
9. USE CASES (4–6): "travel commercial", "tourism ad", "nature documentary", "youtube intro", "website hero"
10. CONCEPTUAL (3–4): Abstract concepts. "adventure", "escape", "paradise", "freshness"
11. RELATED SUBJECTS (remaining): Adjacent topics, synonyms, broader/narrower terms.

KEYWORD RULES:
- No duplicates or near-duplicates ("ocean" and "ocean water" — pick one)
- No fillers: "video", "footage", "clip", "mp4", "file" (exception: "stock footage" and "b-roll" ARE valid buyer-intent keywords)
- Use lowercase, no punctuation
- Specific before generic ("akaka falls" before "waterfall")
- Use PLAIN language buyers type, not literary adjectives

⚡ CATEGORY RULES
Pick exactly one from this list (MUST match exactly, case-sensitive):
Animals, Objects & Equipment, Arts & Entertainment, Beauty & Health, Business, Food, Drink, Industry, Location & Buildings, Medical, Nature, Objects & Graphics, People, Religion, Science, Sport & Fitness, Technology, Time Lapse, Transportation, Travel

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
  const { filename, frames, projectName, platform = "generic", settings, existingTitles = [] } = input;

  const effectiveSettings: GenerationSettings = settings ?? {
    keywordCount: 35,
    titleStyle: "seo",
    descStyle: "detailed",
    includeLocation: true,
    includeCameraDetails: true,
    titleMaxChars: 200,
    descMaxChars: 300,
    keywordFormat: "mixed",
  };

  // Build platform-specific instructions
  const platformInstructions = `
⚡ PLATFORM-SPECIFIC INSTRUCTIONS
Target platform: ${PLATFORM_LABELS[platform]}
Required keywords: generate EXACTLY ${effectiveSettings.keywordCount} keywords
Title max length: ${effectiveSettings.titleMaxChars} characters — do not exceed this
Description max length: ${effectiveSettings.descMaxChars} characters — do not exceed this
Title style: ${
    effectiveSettings.titleStyle === "seo"
      ? "SEO-optimized (concise, searchable, lead with buyer-intent keywords)"
      : "Descriptive (natural language, scene-setting, conversational tone)"
  }
Description style: ${
    effectiveSettings.descStyle === "concise"
      ? "Write one concise punchy sentence."
      : "Write 2–3 sentences covering subject, mood, setting, and potential use cases."
  }
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
  const uniquenessInstructions = existingTitles.length > 0
    ? `
⚡ UNIQUENESS REQUIREMENT — THIS IS CRITICAL
This clip is part of a batch where other clips have already been processed. You MUST make this clip's metadata meaningfully different from the rest of the batch.

Already-used titles in this batch (DO NOT repeat or closely paraphrase these):
${existingTitles.map((t, i) => `  ${i + 1}. "${t}"`).join("\n")}

To achieve uniqueness:
- Focus on a different aspect of the scene (composition angle, specific subject, foreground vs background, motion vs stillness)
- Use different lead words in the title
- Vary the mood descriptors (don't just swap synonyms — find a genuinely different angle)
- Vary the keyword set — prioritize what makes THIS specific frame/moment distinct
- Even if clips look similar, there are always micro-differences in composition, light, motion, or framing — find them and lead with those`
    : "";

  const systemPrompt = BASE_SYSTEM_PROMPT + platformInstructions + uniquenessInstructions;

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

  const userMessage = `Generate professional stock footage metadata for this clip.

Filename: ${filename}${projectName ? `\nProject: ${projectName}` : ""}
Platform: ${PLATFORM_LABELS[platform]}

I am providing ${Math.min(frames.length, 4)} extracted frames. Analyze them together to understand the full scene, motion, mood, and content.

Return this exact JSON:
{
  "title": "string (max ${effectiveSettings.titleMaxChars} chars)",
  "description": "string (max ${effectiveSettings.descMaxChars} chars)",
  "keywords": ["string", ... exactly ${effectiveSettings.keywordCount} keywords, strongest first],
  "category": "string (one of the allowed categories)",
  "location": "string or null",
  "confidence": "high|medium|low"
}`;

  let response: Awaited<ReturnType<typeof openai.chat.completions.create>>;
  try {
    response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.55,
      messages: [
        { role: "system", content: systemPrompt },
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

  let parsed: ClipMetadata;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  // Sanitize keywords: deduplicate, remove fillers, lowercase
  const FILLER_KEYWORDS = new Set([
    "video", "footage", "clip", "stock", "mp4", "file", "shot", "frame",
    "recording", "movie", "film", "cinema", "camera",
  ]);

  const rawKeywords: string[] = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean)
    : [];

  const seen = new Set<string>();
  const cleanedKeywords = rawKeywords.filter((kw) => {
    if (FILLER_KEYWORDS.has(kw)) return false;
    if (seen.has(kw)) return false;
    seen.add(kw);
    return true;
  });

  return {
    title: String(parsed.title ?? "").slice(0, effectiveSettings.titleMaxChars),
    description: String(parsed.description ?? "").slice(0, effectiveSettings.descMaxChars),
    keywords: cleanedKeywords.slice(0, effectiveSettings.keywordCount),
    category: String(parsed.category ?? "Nature"),
    location: parsed.location ? String(parsed.location) : null,
    confidence: ["high", "medium", "low"].includes(parsed.confidence)
      ? (parsed.confidence as ClipMetadata["confidence"])
      : "medium",
  };
}
