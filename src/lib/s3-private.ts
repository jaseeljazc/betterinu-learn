/**
 * lib/s3-private.ts — Private S3 bucket helpers for account attachments.
 * Server-only — never import from client components.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const PRIVATE_REGION = process.env.AWS_S3_PRIVATE_REGION!;
const PRIVATE_BUCKET = process.env.AWS_S3_PRIVATE_BUCKET!;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function getClient() {
  return new S3Client({
    region: PRIVATE_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    // Disable automatic flexible checksums that break browser XHR uploads
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/**
 * Validates file type and size, then generates a presigned PUT URL
 * and the final S3 key.
 */
export async function generateUploadPresignedUrl(
  transactionId: string | null,
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<{ presignedUrl: string; s3Key: string }> {
  if (!ALLOWED_TYPES.includes(fileType)) {
    throw new Error(
      `File type '${fileType}' is not allowed. Accepted: JPEG, PNG, WEBP, PDF.`
    );
  }
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error("File size exceeds the 10 MB limit.");
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const safeUuid = uuidv4();
  const folder = transactionId
    ? `account-attachments/${transactionId}`
    : `account-attachments/pending`;
  const s3Key = `${folder}/${safeUuid}.${ext}`;

  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: PRIVATE_BUCKET,
    Key: s3Key,
    ContentType: fileType,
    // Do NOT include ContentLength here — it would be signed with an empty value
    // on the server side, causing SignatureDoesNotMatch when the browser uploads.
  });

  const presignedUrl = await getSignedUrl(client, command, {
    expiresIn: 5 * 60, // 5 minutes
  });

  return { presignedUrl, s3Key };
}

/**
 * Generates a fresh presigned GET URL. Call this on demand — never cache.
 */
export async function generateViewPresignedUrl(s3Key: string): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: PRIVATE_BUCKET,
    Key: s3Key,
  });
  return getSignedUrl(client, command, { expiresIn: 15 * 60 }); // 15 minutes
}

/**
 * Generates a presigned GET URL with Content-Disposition: attachment
 * for browser download.
 */
export async function generateDownloadPresignedUrl(
  s3Key: string,
  fileName: string
): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: PRIVATE_BUCKET,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
  });
  return getSignedUrl(client, command, { expiresIn: 15 * 60 });
}

/**
 * Verifies the object actually exists in S3 (used to confirm upload).
 */
export async function verifyObjectExists(s3Key: string): Promise<boolean> {
  try {
    const client = getClient();
    await client.send(
      new HeadObjectCommand({ Bucket: PRIVATE_BUCKET, Key: s3Key })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Permanently deletes an object from the private bucket.
 */
export async function deletePrivateObject(s3Key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: PRIVATE_BUCKET, Key: s3Key })
  );
}

/**
 * Validates that a key matches the expected pattern for account attachments.
 * Prevents path-traversal attacks.
 */
export function validateS3Key(s3Key: string): boolean {
  return /^account-attachments\/[a-zA-Z0-9_\-./]+$/.test(s3Key);
}

export { ALLOWED_TYPES, MAX_FILE_SIZE };
