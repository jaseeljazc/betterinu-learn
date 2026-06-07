import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

async function run() {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: 'test-upload.pdf',
      ContentType: 'application/pdf',
    });
    const url = await getSignedUrl(client, command, { expiresIn: 300 });
    console.log('Presigned URL:', url);
    
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: 'dummy pdf content',
    });
    console.log('Upload status:', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.log('Error text:', text);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
