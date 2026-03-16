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

const MODEL = "gpt-5";

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

const BASE_SYSTEM_PROMPT = `You are an elite stock footage metadata specialist with deep expertise in what makes footage discoverable and sell well on platforms like Shutterstock, Adobe Stock, Pond5, and Blackbox.global.

Your metadata must reflect how BUYERS search — not how photographers describe. Buyers search for concepts, emotions, use cases, and technical qualities, not just objects.

⚡ TITLE RULES
- Lead with the most visually dominant subject + action + setting.
- Include mood or lighting if notable (golden hour, dramatic, serene).
- No clickbait. No ALL CAPS. No "Stock Footage" in the title.
- Stay within the character limit specified in platform instructions.
- Examples of GOOD titles:
  ✓ "Aerial View of Turquoise Ocean Waves Crashing on Tropical Beach at Sunset"
  ✓ "Young Couple Walking Hand in Hand Through Autumn Forest at Dusk"
  ✓ "Close-Up of Fresh Green Leaves Gently Moving in Breeze"

⚡ DESCRIPTION RULES
- Describe what is visually happening, the mood, and suggest potential use cases.
- Stay within the character limit specified in platform instructions.
- Example: "Stunning aerial footage of pristine turquoise ocean waves breaking on a white sandy beach at golden hour. Ideal for travel, vacation, nature documentaries, and luxury brand campaigns."

⚡ KEYWORD RULES (CRITICAL)
Order matters — strongest first.

Structure your keywords in this priority order:
1. PRIMARY SUBJECTS (3–5): The main subjects. "ocean waves", "tropical beach", "aerial view"
2. ACTIONS & MOTION (3–5): What is happening. "crashing waves", "flowing water", "slow motion"
3. MOOD & EMOTION (3–5): How it feels. "serene", "peaceful", "dramatic", "majestic", "tranquil"
4. ENVIRONMENT & SETTING (4–6): Where it is. "tropical", "coastline", "outdoors", "nature", "paradise"
5. TECHNICAL QUALITIES (3–5): Camera/production. "4K", "drone footage", "aerial", "cinematic", "slow motion", "wide angle"
6. LIGHTING & TIME (2–3): "golden hour", "sunset", "daytime", "blue hour"
7. COLORS (2–3): "turquoise", "golden", "blue sky"
8. USE CASES (4–6): What buyers will use it for. "travel commercial", "vacation ad", "nature documentary", "tourism", "luxury brand"
9. CONCEPTUAL (4–5): Abstract concepts buyers search. "freedom", "adventure", "escape", "paradise", "serenity"
10. RELATED SUBJECTS (remaining): Adjacent topics, synonyms, variations.

KEYWORD RULES:
- No duplicates, no near-duplicates ("ocean" and "ocean water" — pick one)
- No fillers: "video", "footage", "clip", "stock", "mp4", "file", "shot"
- Use lowercase, no punctuation
- Specific before generic ("great barrier reef" before "reef")
- Include both singular and plural only if genuinely distinct

⚡ CATEGORY RULES
Pick exactly one: Nature, Wildlife, People, Business, Technology, Travel, Food & Drink, Sports & Fitness, Architecture, Abstract, Aerial, Underwater, Lifestyle, Events, Transportation

⚡ LOCATION RULES
ONLY include if you can see: recognizable landmark, distinct geography, visible text/signage, or unmistakably unique landscape — OR if the filename/title strongly suggests a location (e.g. "florida-beach.mp4", "hawaii-drone-shot"). Return null if uncertain. NEVER GUESS blindly.

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

  const response = await withRetry(() =>
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
