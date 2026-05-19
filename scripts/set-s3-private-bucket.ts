/**
 * scripts/set-s3-private-bucket.ts
 * Configures the private S3 bucket for account attachments:
 *   - Sets CORS for PUT from localhost and production
 *   - Sets a deny-public-GetObject bucket policy
 * Run with: npx tsx scripts/set-s3-private-bucket.ts
 */
import {
  S3Client,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s3 = new S3Client({
  region: process.env.AWS_S3_PRIVATE_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_PRIVATE_BUCKET!;
const PROD_DOMAIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-production-domain.com";

async function configureBucket() {
  if (!BUCKET) {
    console.error("❌ AWS_S3_PRIVATE_BUCKET is not set in .env.local");
    process.exit(1);
  }

  console.log(`Configuring private bucket: ${BUCKET}`);

  // 1. Block all public access
  console.log("1. Blocking all public access…");
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    })
  );
  console.log("✓ Public access blocked");

  // 2. Set CORS for presigned PUT uploads
  console.log("2. Setting CORS rules…");
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["http://localhost:3000", PROD_DOMAIN],
            AllowedMethods: ["PUT", "GET"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
  console.log("✓ CORS configured");

  // 3. Explicit deny-public-GetObject bucket policy
  console.log("3. Setting deny-public policy…");
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "DenyPublicGetObject",
        Effect: "Deny",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${BUCKET}/*`,
        Condition: {
          StringNotEquals: {
            "aws:PrincipalType": "IAMUser",
          },
        },
      },
    ],
  };
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(policy),
    })
  );
  console.log("✓ Deny-public policy applied");

  console.log(`\n✅ Private bucket '${BUCKET}' is fully configured.`);
}

configureBucket().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
