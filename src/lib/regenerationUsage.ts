import { supabaseAdmin } from "@/lib/supabase-admin";

type RegenerationEventInput = {
  clipId: string;
  userId: string;
  projectId: string;
  originalFilename: string | null;
  metadataTitle?: string | null;
  metadataKeywords?: string[] | null;
};

export async function getRegensUsedSince(userId: string, periodStart: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("clip_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "regenerated")
    .gte("created_at", periodStart);

  return count ?? 0;
}

export async function recordRegenerationEvent(input: RegenerationEventInput): Promise<void> {
  await supabaseAdmin.from("clip_history").insert({
    clip_id: input.clipId,
    user_id: input.userId,
    project_id: input.projectId,
    original_filename: input.originalFilename,
    action: "regenerated",
    metadata_title: input.metadataTitle ?? null,
    metadata_keywords: input.metadataKeywords ?? null,
  });
}

export async function syncRegenerationCounter(userId: string, periodStart: string): Promise<number> {
  const count = await getRegensUsedSince(userId, periodStart);

  await supabaseAdmin
    .from("profiles")
    .update({
      regens_used_this_month: count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return count;
}
