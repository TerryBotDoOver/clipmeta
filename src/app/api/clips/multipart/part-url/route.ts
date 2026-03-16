import { NextRequest, NextResponse } from "next/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req: NextRequest) {
  try {
    const { storage_path, upload_id, part_number } = await req.json();

    if (!storage_path || !upload_id || !part_number) {
      return NextResponse.json(
        { message: "storage_path, upload_id, and part_number are required." },
        { status: 400 }
      );
    }

    const command = new UploadPartCommand({
      Bucket: R2_BUCKET,
      Key: storage_path,
      UploadId: upload_id,
      PartNumber: part_number,
    });

    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error("Multipart part-url error:", err);
    return NextResponse.json({ message: "Failed to generate part upload URL." }, { status: 500 });
  }
}
