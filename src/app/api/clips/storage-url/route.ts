import { NextRequest, NextResponse } from "next/server";
import { getR2ReadUrl } from "@/lib/r2";

export async function GET(req: NextRequest) {
  const storagePath = req.nextUrl.searchParams.get("path");

  if (!storagePath) {
    return NextResponse.json({ message: "path is required." }, { status: 400 });
  }

  try {
    const signedUrl = await getR2ReadUrl(storagePath);
    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error("R2 read URL error:", err);
    return NextResponse.json(
      { message: "Failed to generate read URL." },
      { status: 500 }
    );
  }
}
