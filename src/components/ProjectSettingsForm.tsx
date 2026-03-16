"use client";

import { useState } from "react";
import {
  Platform,
  PLATFORM_LABELS,
  PLATFORM_DESCRIPTIONS,
  PLATFORM_PRESETS,
} from "@/lib/platform-presets";

const PLATFORMS: Platform[] = ["blackbox", "pond5", "adobe_stock", "shutterstock", "generic"];

export function ProjectSettingsForm() {
  const defaultPreset = PLATFORM_PRESETS["blackbox"];
  const [platform, setPlatform] = useState<Platform>("blackbox");
  const [keywordCount, setKeywordCount] = useState(defaultPreset.keywordCount);
  const [titleStyle, setTitleStyle] = useState<"seo" | "descriptive">(defaultPreset.titleStyle);
  const [descStyle, setDescStyle] = useState<"detailed" | "concise">(defaultPreset.descStyle);
  const [includeLocation, setIncludeLocation] = useState(defaultPreset.includeLocation);
  const [includeCameraDetails, setIncludeCameraDetails] = useState(defaultPreset.includeCameraDetails);
  const [titleMaxChars, setTitleMaxChars] = useState(defaultPreset.titleMaxChars);
  const [descMaxChars, setDescMaxChars] = useState(defaultPreset.descMaxChars);
  const [keywordFormat, setKeywordFormat] = useState<"mixed" | "single" | "phrases">(defaultPreset.keywordFormat);

  function handlePlatformChange(p: Platform) {
    const preset = PLATFORM_PRESETS[p];
    setPlatform(p);
    setKeywordCount(preset.keywordCount);
    setTitleStyle(preset.titleStyle);
    setDescStyle(preset.descStyle);
    setTitleMaxChars(preset.titleMaxChars);
    setDescMaxChars(preset.descMaxChars);
    setKeywordFormat(preset.keywordFormat);
  }

  return (
    <>
      {/* Hidden inputs for server action */}
      <input type="hidden" name="platform" value={platform} />
      <input type="hidden" name="keywordCount" value={keywordCount} />
      <input type="hidden" name="titleStyle" value={titleStyle} />
      <input type="hidden" name="descStyle" value={descStyle} />
      <input type="hidden" name="includeLocation" value={includeLocation ? "on" : "off"} />
      <input type="hidden" name="includeCameraDetails" value={includeCameraDetails ? "on" : "off"} />
      <input type="hidden" name="titleMaxChars" value={titleMaxChars} />
      <input type="hidden" name="descMaxChars" value={descMaxChars} />
      <input type="hidden" name="keywordFormat" value={keywordFormat} />

      {/* Platform selector */}
      <div>
        <p className="block text-sm font-medium text-foreground">Target platform</p>
        <p className="mt-1 text-xs text-muted-foreground">
          ClipMeta will tailor keyword count, title style, and character limits automatically.
        </p>
        <div className="mt-3 space-y-2">
          {PLATFORMS.map((p) => {
            const preset = PLATFORM_PRESETS[p];
            const selected = platform === p;
            return (
              <label
                key={p}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="_platform_display"
                  value={p}
                  checked={selected}
                  onChange={() => handlePlatformChange(p)}
                  className="mt-0.5 accent-violet-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>
                      {PLATFORM_LABELS[p]}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {preset.keywordCount} kw
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {preset.titleMaxChars}c title
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {preset.descMaxChars}c desc
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {PLATFORM_DESCRIPTIONS[p]}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Advanced settings */}
      <details open className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition">
          ⚙ Advanced settings — click to collapse
        </summary>
        <div className="space-y-5 border-t border-border px-4 py-4">

          {/* Keyword count */}
          <div>
            <label className="block text-sm font-medium text-foreground">Keyword count</label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Override the platform default (15–50). Updating the platform resets this.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range" min={15} max={50}
                value={keywordCount}
                onChange={(e) => setKeywordCount(Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <span className="w-8 text-right text-sm font-bold text-primary tabular-nums">{keywordCount}</span>
            </div>
          </div>

          {/* Title max chars */}
          <div>
            <label className="block text-sm font-medium text-foreground">Title max characters</label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Platform limit for the title field. Blackbox = 100, Shutterstock/Adobe = 200.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range" min={50} max={200} step={10}
                value={titleMaxChars}
                onChange={(e) => setTitleMaxChars(Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <span className="w-12 text-right text-sm font-bold text-primary tabular-nums">{titleMaxChars}</span>
            </div>
          </div>

          {/* Description max chars */}
          <div>
            <label className="block text-sm font-medium text-foreground">Description max characters</label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Platform limit for the description field. Blackbox = 200, Pond5 = 500.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range" min={100} max={500} step={25}
                value={descMaxChars}
                onChange={(e) => setDescMaxChars(Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <span className="w-12 text-right text-sm font-bold text-primary tabular-nums">{descMaxChars}</span>
            </div>
          </div>

          {/* Title style */}
          <div>
            <p className="block text-sm font-medium text-foreground">Title style</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["seo", "descriptive"] as const).map((style) => {
                const info = {
                  seo: { label: "SEO-focused", desc: "Short, keyword-rich. Optimized for search algorithms and buyer intent.", recommended: true },
                  descriptive: { label: "Descriptive", desc: "Natural language. Scene-setting sentences that read like a human wrote them.", recommended: false },
                };
                const selected = titleStyle === style;
                return (
                  <label key={style} className={`cursor-pointer rounded-lg border p-3 transition ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <input type="radio" name="_titleStyle_display" value={style} checked={selected} onChange={() => setTitleStyle(style)} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>{info[style].label}</p>
                      {info[style].recommended && <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">recommended</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{info[style].desc}</p>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description style */}
          <div>
            <p className="block text-sm font-medium text-foreground">Description style</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["detailed", "concise"] as const).map((style) => {
                const info = {
                  detailed: { label: "Detailed", desc: "2–3 sentences covering subject, mood, and context. Better for platforms that surface descriptions.", recommended: true },
                  concise: { label: "Concise", desc: "1 punchy sentence. Fast to review, works well when descriptions matter less.", recommended: false },
                };
                const selected = descStyle === style;
                return (
                  <label key={style} className={`cursor-pointer rounded-lg border p-3 transition ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <input type="radio" name="_descStyle_display" value={style} checked={selected} onChange={() => setDescStyle(style)} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>{info[style].label}</p>
                      {info[style].recommended && <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">recommended</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{info[style].desc}</p>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Keyword format */}
          <div>
            <p className="block text-sm font-medium text-foreground">Keyword format</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["mixed", "single", "phrases"] as const).map((fmt) => {
                const info = {
                  mixed: { label: "Mixed", desc: "Best coverage. Combines single words and phrases for maximum discoverability.", recommended: true },
                  single: { label: "Single words", desc: 'One word per keyword. e.g. "waterfall", "aerial", "sunset".', recommended: false },
                  phrases: { label: "Phrases only", desc: 'Multi-word only. e.g. "golden hour", "aerial view", "slow motion".', recommended: false },
                };
                const selected = keywordFormat === fmt;
                return (
                  <label key={fmt} className={`cursor-pointer rounded-lg border p-3 transition ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <input type="radio" name="_keywordFormat_display" value={fmt} checked={selected} onChange={() => setKeywordFormat(fmt)} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>{info[fmt].label}</p>
                      {info[fmt].recommended && <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">recommended</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{info[fmt].desc}</p>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={includeLocation}
                onChange={(e) => setIncludeLocation(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-violet-500"
              />
              <div>
                <span className="text-sm font-medium text-foreground">Include location / region</span>
                <p className="text-xs text-muted-foreground">Add geography keywords when identifiable from frames or titles.</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={includeCameraDetails}
                onChange={(e) => setIncludeCameraDetails(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-violet-500"
              />
              <div>
                <span className="text-sm font-medium text-foreground">Include camera &amp; equipment details</span>
                <p className="text-xs text-muted-foreground">Add camera perspective keywords (aerial, drone, close-up, wide shot).</p>
              </div>
            </label>
          </div>

        </div>
      </details>
    </>
  );
}
