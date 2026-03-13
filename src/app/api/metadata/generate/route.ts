import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateMetadata } from "@/lib/generateMetadata";

export async function POST(req: NextRequest) {
  try {
    const { clip_id, frames } = await req.json();

    if (!clip_id) {
      return NextResponse.json(
        { message: "clip_id is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { message: "frames array is required." },
        { status: 400 }
      );
    }

    // Fetch the clip and its project
    const { data: clip, error: clipError } = await supabase
      .from("clips")
      .select("*, projects(name)")
      .eq("id", clip_id)
      .single();

    if (clipError || !clip) {
      return NextResponse.json(
        { message: "Clip not found." },
        { status: 404 }
      );
    }

    // Mark clip as processing
    await supabase
      .from("clips")
      .update({ metadata_status: "processing" })
      .eq("id", clip_id);

    // Generate metadata via OpenAI
    let metadata;
    try {
      metadata = await generateMetadata({
        filename: clip.original_filename,
        frames,
        projectName: clip.projects?.name,
      });
    } catch (genError: unknown) {
      // Mark as failed
      await supabase
        .from("clips")
        .update({ metadata_status: "failed" })
        .eq("id", clip_id);

      return NextResponse.json(
        {
          message:
            genError instanceof Error
              ? genError.message
              : "Metadata generation failed.",
        },
        { status: 500 }
      );
    }

    // Store results in metadata_results table
    const { error: insertError } = await supabase
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
        model_used: "gpt-4o-mini",
      });

    if (insertError) {
      await supabase
        .from("clips")
        .update({ metadata_status: "failed" })
        .eq("id", clip_id);

      return NextResponse.json(
        { message: "Failed to save metadata results." },
        { status: 500 }
      );
    }

    // Mark clip as complete
    await supabase
      .from("clips")
      .update({ metadata_status: "complete" })
      .eq("id", clip_id);

    return NextResponse.json({ ok: true, metadata });
  } catch (err) {
    return NextResponse.json(
      { message: "Unexpected error during metadata generation." },
      { status: 500 }
    );
  }
}
