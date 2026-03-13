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

const SYSTEM_PROMPT = `You are a professional stock footage metadata specialist. Your job is to generate accurate, stock-ready metadata for video clips.

RULES — follow these strictly:
- Titles: 5-10 words, natural, descriptive, stock-searchable. No clickbait. No ALL CAPS.
- Descriptions: 1-2 sentences. Describe what is visually happening. Stock-friendly language.
- Keywords: 20-40 keywords. Specific before generic. No repetition. No weak fillers like "video", "footage", "clip", "stock". Include: subject, action, setting, mood, colors, time of day if apparent.
- Category: Pick the single most fitting category from this list: Nature, Wildlife, People, Business, Technology, Travel, Food & Drink, Sports & Fitness, Architecture, Abstract, Aerial, Underwater, Lifestyle, Events, Transportation.
- Location: Only include if there is strong visual evidence (recognizable landmark, distinct geography, signage). If uncertain, return null. Do NOT guess.
- Confidence: Rate your overall confidence as high/medium/low based on visual clarity.

CRITICAL: Do not invent objects, people, or locations that are not clearly visible. If a frame is dark or unclear, rely on the filename for context. Be broader rather than falsely specific.

Return ONLY valid JSON matching the exact schema provided. No extra text.`;

export async function generateMetadata(
  input: GenerateMetadataInput
): Promise<ClipMetadata> {
  const { filename, frames, projectName } = input;

  // Build vision content blocks from frames
  const imageBlocks: OpenAI.Chat.ChatCompletionContentPart[] = frames
    .slice(0, 4)
    .map((frame) => ({
      type: "image_url" as const,
      image_url: {
        url: frame,
        detail: "low" as const, // cost-efficient for metadata generation
      },
    }));

  const userMessage = `Generate stock footage metadata for this clip.

Filename: ${filename}
${projectName ? `Project: ${projectName}` : ""}

I am providing ${frames.length} extracted frames from the video. Analyze them together to understand the full content.

Return this exact JSON structure:
{
  "title": "string",
  "description": "string", 
  "keywords": ["string", "string"],
  "category": "string",
  "location": "string or null",
  "confidence": "high|medium|low"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // cost-efficient vision model
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: userMessage,
          },
        ],
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

  // Validate and sanitize
  return {
    title: String(parsed.title ?? "").slice(0, 200),
    description: String(parsed.description ?? "").slice(0, 500),
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.map(String).slice(0, 50)
      : [],
    category: String(parsed.category ?? ""),
    location: parsed.location ? String(parsed.location) : null,
    confidence: ["high", "medium", "low"].includes(parsed.confidence)
      ? (parsed.confidence as ClipMetadata["confidence"])
      : "medium",
  };
}
