"use client";

import { useState, useCallback } from "react";
import { ReviewQueue } from "@/components/ReviewQueue";
import { ProjectMetaCard, type ProjectSettings } from "@/components/ProjectMetaCard";

type Clip = {
  id: string;
  original_filename: string;
  file_size_bytes: number | null;
  metadata_status: string;
  upload_status: string | null;
  is_reviewed: boolean;
  metadata_results: {
    title: string;
    description: string;
    keywords: string[];
    category: string;
    location: string | null;
    confidence: string;
    thumbnail_url?: string | null;
  } | null;
  is_editorial?: boolean | null;
  editorial_text?: string | null;
  editorial_city?: string | null;
  editorial_state?: string | null;
  editorial_country?: string | null;
  editorial_date?: string | null;
};

type Props = {
  clips: Clip[];
  clipUrls: Record<string, string>;
  pendingClips: { id: string; filename: string; storageUrl: string }[];
  plan: string;
  projectId: string;
  projectLocation: string | null;
  projectShootingDate: string | null;
  pinnedKeywords: string | null;
  pinnedKeywordsPosition: string | null;
  isEditorial: boolean;
  editorialText: string | null;
  editorialCity: string | null;
  editorialState: string | null;
  editorialCountry: string | null;
  editorialDate: string | null;
};

export function ReviewPageClient({
  clips, clipUrls, pendingClips, plan, projectId,
  projectLocation, projectShootingDate,
  pinnedKeywords: initialPinned, pinnedKeywordsPosition: initialPosition,
  isEditorial: initialIsEditorial, editorialText: initialEditorialText,
  editorialCity: initialEditorialCity, editorialState: initialEditorialState,
  editorialCountry: initialEditorialCountry, editorialDate: initialEditorialDate,
}: Props) {
  const [pinned, setPinned] = useState(initialPinned);
  const [position, setPosition] = useState(initialPosition);
  const [isEditorial, setIsEditorial] = useState(initialIsEditorial);
  const [editorialText, setEditorialText] = useState(initialEditorialText);
  const [editorialCity, setEditorialCity] = useState(initialEditorialCity);
  const [editorialState, setEditorialState] = useState(initialEditorialState);
  const [editorialCountry, setEditorialCountry] = useState(initialEditorialCountry);
  const [editorialDate, setEditorialDate] = useState(initialEditorialDate);

  const handleSettingsSaved = useCallback((settings: ProjectSettings) => {
    setPinned(settings.pinnedKeywords);
    setPosition(settings.pinnedKeywordsPosition);
    setIsEditorial(settings.isEditorial);
    setEditorialText(settings.editorialText);
    setEditorialCity(settings.editorialCity);
    setEditorialState(settings.editorialState);
    setEditorialCountry(settings.editorialCountry);
    setEditorialDate(settings.editorialDate);
  }, []);

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-[1.4fr_0.9fr]">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-6">
        <ReviewQueue
          clips={clips}
          clipUrls={clipUrls}
          pendingClips={pendingClips}
          projectId={projectId}
          plan={plan}
          projectLocation={projectLocation}
          projectShootingDate={projectShootingDate}
          pinnedKeywords={pinned}
          pinnedKeywordsPosition={position}
          projectIsEditorial={isEditorial}
          projectEditorialText={editorialText}
          projectEditorialCity={editorialCity}
          projectEditorialState={editorialState}
          projectEditorialCountry={editorialCountry}
          projectEditorialDate={editorialDate}
        />
      </section>

      <aside className="space-y-6">
        <ProjectMetaCard
          projectId={projectId}
          initialPinnedKeywords={pinned}
          initialPinnedKeywordsPosition={position}
          initialLocation={projectLocation}
          initialShootingDate={projectShootingDate}
          initialIsEditorial={isEditorial}
          initialEditorialText={editorialText}
          initialEditorialCity={editorialCity}
          initialEditorialState={editorialState}
          initialEditorialCountry={editorialCountry}
          initialEditorialDate={editorialDate}
          onSettingsSaved={handleSettingsSaved}
        />
      </aside>
    </div>
  );
}
