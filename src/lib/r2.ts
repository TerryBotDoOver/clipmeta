import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "clipmeta-uploads";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/** Generate a presigned URL for direct browser → R2 upload (PUT) */
export async function getR2UploadUrl(
  key: string,
  contentType: string = "video/mp4",
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn });
}

/** Generate a presigned URL for reading/downloading a file from R2 */
export async function getR2ReadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn });
}

/** Delete an object from R2 by key */
export async function deleteR2Object(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  }));
}
