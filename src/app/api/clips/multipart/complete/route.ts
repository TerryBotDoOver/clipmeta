import { NextRequest, NextResponse } from "next/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    const { storage_path, upload_id, parts } = await req.json();

    if (!storage_path || !upload_id || !Array.isArray(parts)) {
      return NextResponse.json(
        { message: "storage_path, upload_id, and parts array are required." },
        { status: 400 }
      );
    }

    const normalizedParts = parts
      .map((p: { partNumber?: number; etag?: string; PartNumber?: number; ETag?: string }) => ({
        PartNumber: p.partNumber ?? p.PartNumber,
        ETag: p.etag ?? p.ETag,
      }))
      .filter((p: { PartNumber?: number; ETag?: string }) => typeof p.PartNumber === "number" && typeof p.ETag === "string");

    if (normalizedParts.length !== parts.length) {
      return NextResponse.json(
        { message: "Each multipart part must include a part number and ETag." },
        { status: 400 }
      );
    }

    const command = new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: storage_path,
      UploadId: upload_id,
      MultipartUpload: {
        Parts: normalizedParts,
      },
    });

    await r2.send(command);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Multipart complete error:", err);
    return NextResponse.json({ message: "Failed to complete multipart upload." }, { status: 500 });
  }
}
