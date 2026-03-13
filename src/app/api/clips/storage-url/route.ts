import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { storage_path } = await req.json();

    if (!storage_path) {
      return NextResponse.json(
        { message: "storage_path is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from("project-uploads")
      .createSignedUrl(storage_path, 600); // 10 min expiry

    if (error || !data) {
      return NextResponse.json(
        { message: error?.message || "Failed to generate URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json(
      { message: "Unexpected error." },
      { status: 500 }
    );
  }
}
