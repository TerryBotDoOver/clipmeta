"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const CATEGORIES = [
  "Nature", "Wildlife", "People", "Business", "Technology",
  "Travel", "Food & Drink", "Sports & Fitness", "Architecture",
  "Abstract", "Aerial", "Underwater", "Lifestyle", "Events", "Transportation",
];

export function MetadataEditor({ clipId, initial }: MetadataEditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [keywords, setKeywords] = useState<string[]>(initial.keywords);
  const [category, setCategory] = useState(initial.category);
  const [location, setLocation] = useState(initial.location ?? "");
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const kwInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const markDirty = () => setDirty(true);

  const removeKeyword = useCallback((index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }, []);

  const addKeyword = useCallback(() => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (!trimmed || keywords.includes(trimmed)) {
      setNewKeyword("");
      return;
    }
    setKeywords((prev) => [...prev, trimmed]);
    setNewKeyword("");
    setDirty(true);
  }, [newKeyword, keywords]);

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
    if (e.key === "Backspace" && newKeyword === "" && keywords.length > 0) {
      removeKeyword(keywords.length - 1);
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = keywords.indexOf(active.id as string);
      const newIndex = keywords.indexOf(over.id as string);
      setKeywords(arrayMove(keywords, oldIndex, newIndex));
      setDirty(true);
    }
  }

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
          keywords,
          category,
          location: location.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save.");
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert("Failed to save metadata. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); markDirty(); }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition"
          placeholder="Enter title…"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); markDirty(); }}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition resize-none"
          placeholder="Enter description…"
        />
      </div>

      {/* Keywords — drag to reorder */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Keywords <span className="normal-case font-normal">({keywords.length})</span>
        </label>
        <div
          className="min-h-[44px] w-full rounded-lg border border-border bg-background px-2 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:border-ring focus-within:ring-1 focus-within:ring-ring transition"
          onClick={() => kwInputRef.current?.focus()}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={keywords} strategy={horizontalListSortingStrategy}>
              {keywords.map((kw, i) => (
                <SortableKeywordChip
                  key={kw}
                  id={kw}
                  label={kw}
                  onRemove={() => removeKeyword(i)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <input
            ref={kwInputRef}
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            onBlur={addKeyword}
            placeholder={keywords.length === 0 ? "Type a keyword and press Enter…" : "Add keyword…"}
            className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter or comma to add · Backspace removes last · Hover to delete · Drag to reorder
        </p>
      </div>

      {/* Category + Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); markDirty(); }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Location <span className="normal-case font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => { setLocation(e.target.value); markDirty(); }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition"
            placeholder="e.g. Florida, USA"
          />
        </div>
      </div>

      {/* Confidence (read-only) */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">AI confidence:</span>
        <span className={`font-medium ${
          initial.confidence === "high" ? "text-green-500"
          : initial.confidence === "medium" ? "text-amber-400"
          : "text-red-400"
        }`}>{initial.confidence}</span>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-xs text-green-500 font-medium">✓ Saved</span>}
        {dirty && !saving && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  );
}

/* ── Sortable keyword chip ── */
function SortableKeywordChip({
  id,
  label,
  onRemove,
}: {
  id: string;
  label: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const [hovered, setHovered] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground select-none cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...attributes}
      {...listeners}
    >
      {label}
      {hovered && !isDragging && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted-foreground/30 text-foreground hover:bg-red-500 hover:text-white transition cursor-pointer"
          title={`Remove "${label}"`}
        >
          ×
        </button>
      )}
    </span>
  );
}
