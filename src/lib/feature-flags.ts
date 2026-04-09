import { supabaseAdmin } from "./supabase-admin";

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Check if a feature flag is enabled (server-side only).
 * Usage: if (await isFeatureEnabled('batch_upload')) { ... }
 */
export async function isFeatureEnabled(name: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("feature_flags")
    .select("enabled")
    .eq("name", name)
    .single();

  return data?.enabled ?? false;
}

/**
 * Get all feature flags (server-side, for admin page).
 */
export async function getAllFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

/**
 * Toggle a feature flag on/off (server-side).
 */
export async function setFlag(name: string, enabled: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from("feature_flags")
    .update({ enabled })
    .eq("name", name);

  if (error) throw error;
}

/**
 * Create a new feature flag.
 */
export async function createFlag(
  name: string,
  description?: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("feature_flags")
    .insert({ name, description, enabled: false });

  if (error) throw error;
}

/**
 * Delete a feature flag.
 */
export async function deleteFlag(name: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("feature_flags")
    .delete()
    .eq("name", name);

  if (error) throw error;
}
