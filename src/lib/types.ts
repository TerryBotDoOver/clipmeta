export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export type Clip = {
  id: string;
  project_id: string;
  original_filename: string;
  storage_path: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  upload_status: string;
  metadata_status: string;
  created_at: string;
};

export type MetadataResult = {
  id: string;
  clip_id: string;
  title: string;
  description: string;
  keywords: string[];
  category: string;
  location: string | null;
  confidence: "high" | "medium" | "low";
  model_used: string;
  generated_at: string;
};

export type ClipWithMetadata = Clip & {
  metadata_results: MetadataResult | null;
};
