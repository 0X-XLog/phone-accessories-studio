import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { uploadToR2, generateUploadKey } from '@/lib/r2';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const key = generateUploadKey(file.name, 'pa-studio/originals');
    const result = await uploadToR2(file, key, file.type);

    return NextResponse.json({ url: result.url, key: result.key });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: String(error) },
      { status: 500 }
    );
  }
}
