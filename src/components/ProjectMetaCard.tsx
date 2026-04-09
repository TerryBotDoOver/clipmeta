"use client";

import { useState } from "react";
import { BLACKBOX_COUNTRIES } from "@/lib/blackbox-countries";

export type ProjectSettings = {
  pinnedKeywords: string | null;
  pinnedKeywordsPosition: string;
  isEditorial: boolean;
  editorialText: string | null;
  editorialCity: string | null;
  editorialState: string | null;
  editorialCountry: string | null;
  editorialDate: string | null;
};

interface ProjectMetaCardProps {
  projectId: string;
  initialPinnedKeywords: string | null;
  initialPinnedKeywordsPosition: string | null;
  initialLocation: string | null;
  initialShootingDate: string | null;
  initialIsEditorial: boolean;
  initialEditorialText: string | null;
  initialEditorialCity: string | null;
  initialEditorialState: string | null;
  initialEditorialCountry: string | null;
  initialEditorialDate: string | null;
  onSettingsSaved?: (settings: ProjectSettings) => void;
}

export function ProjectMetaCard({ projectId, initialPinnedKeywords, initialPinnedKeywordsPosition, initialLocation, initialShootingDate, initialIsEditorial, initialEditorialText, initialEditorialCity, initialEditorialState, initialEditorialCountry, initialEditorialDate, onSettingsSaved }: ProjectMetaCardProps) {
  const [pinnedKeywords, setPinnedKeywords] = useState(initialPinnedKeywords ?? "");
  const [pinnedPosition, setPinnedPosition] = useState(initialPinnedKeywordsPosition ?? "beginning");
  const [location, setLocation] = useState(initialLocation ?? "");
  const [shootingDate, setShootingDate] = useState(
    initialShootingDate ? initialShootingDate.slice(0, 10) : ""
  );
  const [isEditorial, setIsEditorial] = useState(initialIsEditorial);
  const [editorialText, setEditorialText] = useState(initialEditorialText ?? "");
  const [editorialCity, setEditorialCity] = useState(initialEditorialCity ?? "");
  const [editorialState, setEditorialState] = useState(initialEditorialState ?? "");
  const [editorialCountry, setEditorialCountry] = useState(initialEditorialCountry ?? "");
  const [editorialDate, setEditorialDate] = useState(
    initialEditorialDate ? initialEditorialDate.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/update-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          pinnedKeywords: pinnedKeywords || null,
          pinnedKeywordsPosition: pinnedPosition,
          location: location || null,
          shootingDate: shootingDate || null,
          isEditorial,
          editorialText: editorialText || null,
          editorialCity: editorialCity || null,
          editorialState: editorialState || null,
          editorialCountry: editorialCountry || null,
          editorialDate: editorialDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save");
      }
      setSaved(true);
      // Dispatch custom event so ReviewQueue updates without page reload
      window.dispatchEvent(new CustomEvent("clipmeta:settings-saved", {
        detail: {
          pinnedKeywords: pinnedKeywords || null,
          pinnedKeywordsPosition: pinnedPosition,
          isEditorial,
          editorialText: editorialText || null,
          editorialCity: editorialCity || null,
          editorialState: editorialState || null,
          editorialCountry: editorialCountry || null,
          editorialDate: editorialDate || null,
        },
      }));
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Project Settings</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        These apply to every clip in this project.
      </p>

      <div className="mt-4 space-y-4">
        {/* Mandatory Keywords */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Mandatory Keywords
          </label>
          <input
            type="text"
            value={pinnedKeywords}
            onChange={(e) => setPinnedKeywords(e.target.value)}
            placeholder="e.g. Greece, Zagori, mountain pass"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {pinnedPosition === 'beginning'
              ? "Added to the start of every clip's keywords."
              : pinnedPosition === 'end'
              ? "Appended to the end of every clip's keywords."
              : "Inserted in the middle of every clip's keywords."}
          </p>
          <div className="flex gap-1 mt-1.5">
            {['beginning', 'middle', 'end'].map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPinnedPosition(pos)}
                className={`px-3 py-1 text-xs rounded-md border transition ${
                  pinnedPosition === pos
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                }`}
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Shooting Country */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Shooting Country
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="">Select a country...</option>
            {BLACKBOX_COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">Fills column M in Blackbox CSV.</p>
        </div>

        {/* Shooting Date */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Shooting Date
          </label>
          <input
            type="date"
            value={shootingDate}
            onChange={(e) => setShootingDate(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Fills column N in Blackbox CSV.</p>
        </div>

        {/* Editorial Content Toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEditorial}
              onChange={(e) => setIsEditorial(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Editorial Content
            </span>
          </label>
          <p className="mt-1 text-[11px] text-muted-foreground">Mark all clips in this project as editorial.</p>
        </div>

        {/* Editorial Detail Fields */}
        {isEditorial && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Editorial Text
              </label>
              <textarea
                value={editorialText}
                onChange={(e) => setEditorialText(e.target.value)}
                placeholder="Describe the editorial event..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary resize-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Fills column G in Blackbox CSV.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Editorial City
              </label>
              <input
                type="text"
                value={editorialCity}
                onChange={(e) => setEditorialCity(e.target.value)}
                placeholder="e.g. New York"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Fills column H in Blackbox CSV.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Editorial State
              </label>
              <input
                type="text"
                value={editorialState}
                onChange={(e) => setEditorialState(e.target.value)}
                placeholder="e.g. NY"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Fills column I in Blackbox CSV.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Editorial Country
              </label>
              <input
                type="text"
                value={editorialCountry}
                onChange={(e) => setEditorialCountry(e.target.value)}
                placeholder="e.g. United States"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Fills column J in Blackbox CSV.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Editorial Date
              </label>
              <input
                type="date"
                value={editorialDate}
                onChange={(e) => setEditorialDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Fills column K in Blackbox CSV.</p>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
