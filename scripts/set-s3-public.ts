import { S3Client, PutBucketPolicyCommand, DeletePublicAccessBlockCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.AWS_BUCKET_NAME!;

async function makeBucketPublic() {
  console.log(`Configuring bucket '${bucketName}' for public access...`);

  try {
    // 1. First, we need to disable "Block Public Access" if it's on
    console.log("1. Removing Public Access Block...");
    await s3.send(new DeletePublicAccessBlockCommand({
      Bucket: bucketName
    }));
    console.log("✅ Public Access Block removed.");
  } catch (err: any) {
    console.log("⚠️ Could not remove Public Access Block (it may already be off or you lack permissions):", err.message);
  }

  try {
    // 2. Add the public read bucket policy
    console.log("2. Setting Public Read Bucket Policy...");
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucketName}/*`]
        }
      ]
    };

    await s3.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy)
    }));
    console.log("✅ Bucket policy successfully applied!");
    console.log("🎉 All files in the bucket should now be publicly readable.");
  } catch (err: any) {
    console.error("❌ Failed to set bucket policy:", err.message);
    process.exit(1);
  }
}

makeBucketPublic();
