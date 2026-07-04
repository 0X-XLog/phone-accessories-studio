import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.R2_BUCKET_NAME || '';

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadToR2(
  file: File | Buffer,
  key: string,
  contentType: string
): Promise<UploadResult> {
  let body: Buffer | Uint8Array;

  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    body = new Uint8Array(arrayBuffer);
  } else {
    body = file;
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return { url: publicUrl, key };
}

export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  await r2Client.send(command);
}

export function generateUploadKey(filename: string, prefix: string = 'pa-studio'): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const ext = filename.split('.').pop();
  return `${prefix}/${timestamp}-${randomString}.${ext}`;
}
