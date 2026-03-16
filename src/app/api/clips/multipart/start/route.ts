import { NextRequest, NextResponse } from "next/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    const { storage_path, content_type } = await req.json();

    if (!storage_path) {
      return NextResponse.json({ message: "storage_path is required." }, { status: 400 });
    }

    const command = new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: storage_path,
      ContentType: content_type || "video/mp4",
    });

    const result = await r2.send(command);

    return NextResponse.json({
      uploadId: result.UploadId,
      storagePath: storage_path,
    });
  } catch (err) {
    console.error("Multipart start error:", err);
    return NextResponse.json({ message: "Failed to start multipart upload." }, { status: 500 });
  }
}
