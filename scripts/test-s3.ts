import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME!;

async function test() {
  console.log("── AWS S3 Connection Test ──");
  console.log(`Region:  ${process.env.AWS_REGION}`);
  console.log(`Bucket:  ${BUCKET}`);
  console.log();

  // 1. Upload a small test file
  const testKey = `_connection_test_${Date.now()}.txt`;
  console.log(`1. Uploading test file: ${testKey} ...`);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: testKey,
    Body: Buffer.from("LMS S3 connection test - safe to delete"),
    ContentType: "text/plain",
  }));
  console.log("   ✅ Upload succeeded!");

  const url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`;
  console.log(`   URL: ${url}`);

  // 2. Clean up the test file
  console.log(`2. Deleting test file ...`);
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testKey }));
  console.log("   ✅ Cleanup done!");

  console.log();
  console.log("🎉 AWS S3 bucket is fully connected and working!");
}

test().catch((err) => {
  console.error("❌ S3 connection FAILED:");
  console.error(err.message);
  process.exit(1);
});
