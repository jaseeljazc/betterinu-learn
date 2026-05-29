import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function setCors() {
  console.log("Setting CORS on bucket:", process.env.AWS_BUCKET_NAME);
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["*"],
            AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    })
  );
  console.log("✅ CORS policy applied! Images should now render in the browser.");
}

setCors().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
