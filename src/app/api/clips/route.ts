import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PLANS, type Plan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { project_id, original_filename, storage_path, file_size_bytes } =
      await req.json();

    if (!project_id || !original_filename || !storage_path) {
      return NextResponse.json(
        { message: "project_id, original_filename, and storage_path are required." },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { message: "Project not found or access denied." },
        { status: 403 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, clips_used_this_month, billing_period_start")
      .eq("id", user.id)
      .maybeSingle();

    const plan = (profile?.plan && profile.plan in PLANS
      ? profile.plan
      : "free") as Plan;

    const limit = PLANS[plan].clips;

    const billingPeriodStart = profile?.billing_period_start
      ? new Date(profile.billing_period_start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Count clips across all user projects this billing period
    const { data: userProjects } = await supabase.from("projects").select("id").eq("user_id", user.id);
    const projectIds = (userProjects ?? []).map((p: { id: string }) => p.id);

    let used = 0;
    if (projectIds.length > 0) {
      const { count: usedCount } = await supabaseAdmin
        .from("clips")
        .select("id", { count: "exact", head: true })
        .in("project_id", projectIds)
        .gte("created_at", billingPeriodStart.toISOString());
      used = usedCount ?? 0;
    }

    if (used >= limit) {
      return NextResponse.json(
        {
          error: "Clip limit reached",
          limit,
          used,
          plan,
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    const { error: insertError } = await supabaseAdmin.from("clips").insert({
      project_id,
      original_filename,
      storage_path,
      file_size_bytes: file_size_bytes ?? null,
      duration_seconds: null,
      upload_status: "uploaded",
      metadata_status: "not_started",
    });

    if (insertError) {
      await supabaseAdmin.storage.from("project-uploads").remove([storage_path]);

      return NextResponse.json(
        { message: insertError.message || "Failed to create clip record." },
        { status: 500 }
      );
    }

    const { data: clip } = await supabaseAdmin
      .from("clips")
      .select("id")
      .eq("project_id", project_id)
      .eq("storage_path", storage_path)
      .single();

    const nextUsed = (profile?.clips_used_this_month ?? 0) + 1;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: user.id, clips_used_this_month: nextUsed, updated_at: new Date().toISOString() });

    return NextResponse.json({ ok: true, clip_id: clip?.id ?? null });
  } catch (err) {
    return NextResponse.json(
      { message: "Unexpected error creating clip record." },
      { status: 500 }
    );
  }
}