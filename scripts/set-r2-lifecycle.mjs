// scripts/set-r2-lifecycle.mjs
// Sets a 21-day expiration on all R2 source uploads.
// Replaces the previous 7-day rule, which was wiping customer files
// before they finished working on projects. See decisions_log 2026-04-26.
import { S3Client, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";

// Load env from .env.local (same parsing pattern as send scripts)
const envText = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim().replace(/^"/, "").replace(/"$/, "").replace(/\r\n$/, "").replace(/\n$/, "").replace(/\r/g, "");
  env[m[1]] = v;
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const command = new PutBucketLifecycleConfigurationCommand({
  Bucket: env.R2_BUCKET_NAME ?? "clipmeta-uploads",
  LifecycleConfiguration: {
    Rules: [
      {
        ID: "delete-source-videos-after-21-days",
        Status: "Enabled",
        Filter: { Prefix: "" },
        Expiration: { Days: 21 },
      },
    ],
  },
});

const result = await client.send(command);
console.log("Lifecycle rule updated to 21 days:");
console.log(JSON.stringify(result, null, 2));
