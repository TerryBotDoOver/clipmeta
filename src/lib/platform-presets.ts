export type Platform =
  | "blackbox"
  | "pond5"
  | "adobe_stock"
  | "shutterstock"
  | "generic";

export type GenerationSettings = {
  keywordCount: number;
  titleStyle: "seo" | "descriptive";
  descStyle: "detailed" | "concise";
  includeLocation: boolean;
  includeCameraDetails: boolean;
  titleMaxChars: number;
  descMaxChars: number;
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  blackbox: "Blackbox.global",
  pond5: "Pond5",
  adobe_stock: "Adobe Stock",
  shutterstock: "Shutterstock",
  generic: "Generic / Other",
};

export const PLATFORM_DESCRIPTIONS: Record<Platform, string> = {
  blackbox: "Aggregates to 20+ platforms. Blackbox-optimized keywords.",
  pond5: "50 keyword limit. Descriptive, natural language titles.",
  adobe_stock: "45 keywords. SEO-focused titles, commercial tone.",
  shutterstock: "50 keywords. Competitive SEO targeting.",
  generic: "Balanced defaults for any platform.",
};

export const PLATFORM_PRESETS: Record<Platform, GenerationSettings> = {
  blackbox: {
    keywordCount: 49,
    titleStyle: "seo",
    descStyle: "detailed",
    includeLocation: true,
    includeCameraDetails: true,
    titleMaxChars: 100,
    descMaxChars: 200,
  },
  pond5: {
    keywordCount: 50,
    titleStyle: "descriptive",
    descStyle: "detailed",
    includeLocation: true,
    includeCameraDetails: true,
    titleMaxChars: 100,
    descMaxChars: 500,
  },
  adobe_stock: {
    keywordCount: 45,
    titleStyle: "seo",
    descStyle: "detailed",
    includeLocation: true,
    includeCameraDetails: false,
    titleMaxChars: 200,
    descMaxChars: 200,
  },
  shutterstock: {
    keywordCount: 50,
    titleStyle: "seo",
    descStyle: "detailed",
    includeLocation: true,
    includeCameraDetails: false,
    titleMaxChars: 200,
    descMaxChars: 200,
  },
  generic: {
    keywordCount: 35,
    titleStyle: "seo",
    descStyle: "detailed",
    includeLocation: true,
    includeCameraDetails: true,
    titleMaxChars: 200,
    descMaxChars: 300,
  },
};

export function getSettings(
  platform: Platform,
  overrides?: Partial<GenerationSettings>
): GenerationSettings {
  return { ...PLATFORM_PRESETS[platform], ...overrides };
}
