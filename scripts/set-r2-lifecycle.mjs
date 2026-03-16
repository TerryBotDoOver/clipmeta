// scripts/set-r2-lifecycle.mjs
import { S3Client, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const command = new PutBucketLifecycleConfigurationCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  LifecycleConfiguration: {
    Rules: [
      {
        ID: "delete-source-videos-after-30-days",
        Status: "Enabled",
        Filter: { Prefix: "" },
        Expiration: { Days: 30 },
      },
    ],
  },
});

const result = await client.send(command);
console.log("Lifecycle rule set:", result);
