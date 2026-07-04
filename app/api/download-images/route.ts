import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProductById, getImagesByProductId } from '@/lib/db';

function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext;
  } catch {}
  return 'jpg';
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const headers: Record<string, string> = {};
    // 1688/alicdn requires Referer to serve images
    if (url.includes('1688.com') || url.includes('alicdn.com')) {
      headers['Referer'] = 'https://detail.1688.com/';
    }
    // Taobao/Tmall images
    if (url.includes('tb.cn') || url.includes('tmall.com') || url.includes('taobaocdn.com')) {
      headers['Referer'] = 'https://detail.tmall.com/';
    }
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000), // 10s timeout per image (was 30s)
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('id');
  const includeGenerated = searchParams.get('generated') === 'true';

  if (!productId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const product = getProductById(productId);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const zip = new JSZip();
  const safeName = (product.name || 'product').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 60);

  // Collect images: { filename, url }
  const imageEntries: { filename: string; url: string }[] = [];

  // Main gallery images — always originals
  (product.original_images || []).forEach((url, i) => {
    const ext = getFileExtension(url);
    imageEntries.push({ filename: `gallery/${String(i + 1).padStart(2, '0')}.${ext}`, url });
  });

  // Description images — always originals
  (product.description_images || []).forEach((url, i) => {
    const ext = getFileExtension(url);
    imageEntries.push({ filename: `description/${String(i + 1).padStart(2, '0')}.${ext}`, url });
  });

  // AI generated images
  if (includeGenerated) {
    const genImages = getImagesByProductId(productId);
    genImages.forEach((img) => {
      const url = img.generated_image_url;
      if (!url) return;
      const ext = getFileExtension(url);
      const typeLabel = img.type || 'generated';
      const ts = img.created_at?.replace(/[:.]/g, '-').slice(0, 19) || 'unknown';
      imageEntries.push({ filename: `generated/${typeLabel}-${ts}.${ext}`, url });
    });
  }

  if (imageEntries.length === 0) {
    return NextResponse.json({ error: 'No images found' }, { status: 404 });
  }

  // Download images in batches of 5 to avoid connection overload
  const BATCH_SIZE = 5;
  const results: { ok: boolean }[] = [];
  for (let i = 0; i < imageEntries.length; i += BATCH_SIZE) {
    const batch = imageEntries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (entry) => {
        const buf = await fetchImage(entry.url);
        if (buf) {
          zip.file(entry.filename, buf);
        }
        return buf !== null;
      })
    );
    for (const r of batchResults) {
      results.push({ ok: r.status === 'fulfilled' && r.value });
    }
  }

  const successCount = results.filter(r => r.ok).length;

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}-images.zip"`,
    },
  });
}
