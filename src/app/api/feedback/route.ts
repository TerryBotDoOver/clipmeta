import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DISCORD_CHANNELS, sendDiscordMessage, truncateForDiscord } from "@/lib/discord";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { type, title, description } = await req.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ message: "Title and description are required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("feedback")
      .insert({
        user_id: user.id,
        user_email: user.email,
        type: type || "suggestion",
        title: title.trim(),
        description: description.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ message: "Failed to save feedback." }, { status: 500 });
    }

    const feedbackType = (type || "suggestion").toString();
    const discordResult = await sendDiscordMessage({
      channelId: DISCORD_CHANNELS.feedback,
      content: truncateForDiscord([
        "**New ClipMeta feedback**",
        `From: ${user.email ?? user.id}`,
        `Type: ${feedbackType}`,
        `Title: ${title.trim()}`,
        "",
        description.trim(),
      ].join("\n")),
    });

    if (!discordResult.ok) {
      console.error("Feedback Discord notification failed:", discordResult);
    }

    return NextResponse.json({ ok: true, id: data.id, discordNotified: discordResult.ok });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ message: "Unexpected error." }, { status: 500 });
  }
}
