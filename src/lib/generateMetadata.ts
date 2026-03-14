import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
};

const SYSTEM_PROMPT = `You are an elite stock footage metadata specialist with deep expertise in what makes footage discoverable and sell well on platforms like Shutterstock, Adobe Stock, Pond5, and Blackbox.global.

Your metadata must reflect how BUYERS search — not how photographers describe. Buyers search for concepts, emotions, use cases, and technical qualities, not just objects.

━━━ TITLE RULES ━━━
- 8-15 words. Natural, descriptive, stock-searchable sentence.
- Lead with the most visually dominant subject + action + setting.
- Include mood or lighting if notable (golden hour, dramatic, serene).
- No clickbait. No ALL CAPS. No "Stock Footage" in the title.
- Examples of GOOD titles:
  • "Aerial View of Turquoise Ocean Waves Crashing on Tropical Beach at Sunset"
  • "Young Couple Walking Hand in Hand Through Autumn Forest at Dusk"
  • "Close-Up of Fresh Green Leaves Gently Moving in Breeze"

━━━ DESCRIPTION RULES ━━━
- 2-3 sentences, 100-200 characters.
- Describe what is visually happening, the mood, and suggest potential use cases.
- Example: "Stunning aerial footage of pristine turquoise ocean waves breaking on a white sandy beach at golden hour. Ideal for travel, vacation, nature documentaries, and luxury brand campaigns."

━━━ KEYWORD RULES (CRITICAL) ━━━
Generate EXACTLY 45-50 keywords. Order matters — strongest first.

Structure your keywords in this priority order:
1. PRIMARY SUBJECTS (3-5): The main subjects. "ocean waves", "tropical beach", "aerial view"
2. ACTIONS & MOTION (3-5): What is happening. "crashing waves", "flowing water", "slow motion"
3. MOOD & EMOTION (3-5): How it feels. "serene", "peaceful", "dramatic", "majestic", "tranquil"
4. ENVIRONMENT & SETTING (4-6): Where it is. "tropical", "coastline", "outdoors", "nature", "paradise"
5. TECHNICAL QUALITIES (3-5): Camera/production. "4K", "drone footage", "aerial", "cinematic", "slow motion", "wide angle"
6. LIGHTING & TIME (2-3): "golden hour", "sunset", "daytime", "blue hour"
7. COLORS (2-3): "turquoise", "golden", "blue sky"
8. USE CASES (4-6): What buyers will use it for. "travel commercial", "vacation ad", "nature documentary", "tourism", "luxury brand"
9. CONCEPTUAL (4-5): Abstract concepts buyers search. "freedom", "adventure", "escape", "paradise", "serenity"
10. RELATED SUBJECTS (remaining): Adjacent topics, synonyms, variations.

RULES:
- No duplicates, no near-duplicates ("ocean" and "ocean water" both — pick one)
- No fillers: "video", "footage", "clip", "stock", "mp4", "file", "shot"
- Use lowercase, no punctuation in keywords
- Specific before generic ("great barrier reef" before "reef")
- Include both singular and plural only if genuinely distinct ("wave" vs "waves" = keep one)

━━━ CATEGORY RULES ━━━
Pick exactly one: Nature, Wildlife, People, Business, Technology, Travel, Food & Drink, Sports & Fitness, Architecture, Abstract, Aerial, Underwater, Lifestyle, Events, Transportation

━━━ LOCATION RULES ━━━
ONLY include if you can see: recognizable landmark, distinct recognizable geography, visible text/signage, or unmistakably unique landscape. Return null if uncertain. NEVER GUESS.

━━━ CONFIDENCE RULES ━━━
high = clear, well-lit frames with obvious content
medium = some ambiguity but confident in main subject
low = dark, blurry, or heavily ambiguous frames

Return ONLY valid JSON. No extra text. No markdown code blocks.`;

export async function generateMetadata(
  input: GenerateMetadataInput
): Promise<ClipMetadata> {
  const { filename, frames, projectName } = input;

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

I am providing ${Math.min(frames.length, 4)} extracted frames. Analyze them together to understand the full scene, motion, mood, and content.

Return this exact JSON:
{
  "title": "string (8-15 words)",
  "description": "string (2-3 sentences, 100-200 chars)",
  "keywords": ["string", "string", ... exactly 45-50 keywords, strongest first],
  "category": "string (one of the allowed categories)",
  "location": "string or null",
  "confidence": "high|medium|low"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1200,
    temperature: 0.3, // lower = more consistent, less hallucination
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [...imageBlocks, { type: "text", text: userMessage }],
      },
    ],
  });

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
    title: String(parsed.title ?? "").slice(0, 200),
    description: String(parsed.description ?? "").slice(0, 1000),
    keywords: cleanedKeywords.slice(0, 50),
    category: String(parsed.category ?? "Nature"),
    location: parsed.location ? String(parsed.location) : null,
    confidence: ["high", "medium", "low"].includes(parsed.confidence)
      ? (parsed.confidence as ClipMetadata["confidence"])
      : "medium",
  };
}
