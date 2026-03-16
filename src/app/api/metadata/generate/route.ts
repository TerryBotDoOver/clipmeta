import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateMetadata } from "@/lib/generateMetadata";
import { Platform, GenerationSettings } from "@/lib/platform-presets";

export async function POST(req: NextRequest) {
  try {
    const { clip_id, frames } = await req.json();

    if (!clip_id) {
      return NextResponse.json({ message: "clip_id is required." }, { status: 400 });
    }

    if (!Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json({ message: "frames array is required." }, { status: 400 });
    }

    // Fetch the clip and its project
    const { data: clip, error: clipError } = await supabaseAdmin
      .from("clips")
      .select("*, projects(name)")
      .eq("id", clip_id)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ message: "Clip not found." }, { status: 404 });
    }

    // Get project platform settings
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("platform, generation_settings")
      .eq("id", clip.project_id)
      .single();

    const settings: GenerationSettings = project?.generation_settings ?? {
      keywordCount: 35,
      titleStyle: "seo",
      descStyle: "detailed",
      includeLocation: true,
      includeCameraDetails: true,
      titleMaxChars: 200,
      descMaxChars: 300,
    };
    const platform: Platform = (project?.platform as Platform) ?? "generic";

    // Fetch titles already generated in this batch — used to enforce uniqueness
    const { data: existingResults } = await supabaseAdmin
      .from("metadata_results")
      .select("title, clips!inner(project_id)")
      .eq("clips.project_id", clip.project_id)
      .neq("clip_id", clip_id)
      .order("generated_at", { ascending: false })
      .limit(25);

    const existingTitles: string[] = (existingResults ?? [])
      .map((r: { title?: string }) => r.title)
      .filter((t): t is string => typeof t === "string" && t.length > 0);

    // Mark clip as processing
    await supabaseAdmin
      .from("clips")
      .update({ metadata_status: "processing" })
      .eq("id", clip_id);

    // Generate metadata
    let metadata;
    try {
      metadata = await generateMetadata({
        filename: clip.original_filename,
        frames,
        projectName: clip.projects?.name,
        platform,
        settings,
        existingTitles,
      });
    } catch (genError: unknown) {
      await supabaseAdmin
        .from("clips")
        .update({ metadata_status: "failed" })
        .eq("id", clip_id);

      return NextResponse.json(
        { message: genError instanceof Error ? genError.message : "Metadata generation failed." },
        { status: 500 }
      );
    }

    // Store results
    const { error: insertError } = await supabaseAdmin
      .from("metadata_results")
      .upsert({
        clip_id,
        title: metadata.title,
        description: metadata.description,
        keywords: metadata.keywords,
        category: metadata.category,
        location: metadata.location,
        confidence: metadata.confidence,
        generated_at: new Date().toISOString(),
        model_used: "gpt-5.4-pro",
      });

    if (insertError) {
      await supabaseAdmin
        .from("clips")
        .update({ metadata_status: "failed" })
        .eq("id", clip_id);

      return NextResponse.json({ message: "Failed to save metadata results." }, { status: 500 });
    }

    // Mark complete
    await supabaseAdmin
      .from("clips")
      .update({ metadata_status: "complete" })
      .eq("id", clip_id);

    return NextResponse.json({ ok: true, metadata });
  } catch {
    return NextResponse.json({ message: "Unexpected error during metadata generation." }, { status: 500 });
  }
}
