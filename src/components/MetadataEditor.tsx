"use client";

import { useState } from "react";

type MetadataEditorProps = {
  clipId: string;
  initial: {
    title: string;
    description: string;
    keywords: string[];
    category: string;
    location: string | null;
    confidence: string;
  };
};

export function MetadataEditor({ clipId, initial }: MetadataEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [keywordsText, setKeywordsText] = useState(initial.keywords.join(", "));
  const [category, setCategory] = useState(initial.category);
  const [location, setLocation] = useState(initial.location ?? "");
  const [saved, setSaved] = useState(false);

  const CATEGORIES = [
    "Nature", "Wildlife", "People", "Business", "Technology",
    "Travel", "Food & Drink", "Sports & Fitness", "Architecture",
    "Abstract", "Aerial", "Underwater", "Lifestyle", "Events", "Transportation",
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/metadata/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clip_id: clipId,
          title,
          description,
          keywords: keywordsText
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          category,
          location: location.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save.");

      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save metadata. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setTitle(initial.title);
    setDescription(initial.description);
    setKeywordsText(initial.keywords.join(", "));
    setCategory(initial.category);
    setLocation(initial.location ?? "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
          <p className="mt-1 text-sm text-slate-900">{title}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
          <p className="mt-1 text-sm text-slate-700">{description}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Keywords ({keywordsText.split(",").filter((k) => k.trim()).length})
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywordsText
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
              .map((kw, i) => (
                <span
                  key={`${kw}-${i}`}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                >
                  {kw}
                </span>
              ))}
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
            <p className="mt-1 text-sm text-slate-700">{category}</p>
          </div>
          {location && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
              <p className="mt-1 text-sm text-slate-700">{location}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
            <p className={`mt-1 text-sm font-medium ${
              initial.confidence === "high" ? "text-green-700"
              : initial.confidence === "medium" ? "text-amber-700"
              : "text-red-700"
            }`}>{initial.confidence}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Edit
          </button>
          {saved && <span className="text-xs text-green-600">✓ Saved</span>}
        </div>
      </div>
    );
  }

  // Editing mode
  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Keywords <span className="normal-case font-normal text-slate-400">(comma-separated)</span>
        </label>
        <textarea
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Location <span className="normal-case font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={handleCancel}
          className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
