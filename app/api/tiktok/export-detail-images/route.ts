import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProductById, getImagesByProductId } from '@/lib/db';

export const runtime = 'nodejs';

// 批量导出详情图 ZIP：TikTok 批量导入不含详情图，需人工在卖家中心上传。
// 结构：<SKU-商品名>/1.jpg 2.jpg ...（可选 AI 增强版优先）
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
    if (url.includes('1688.com') || url.includes('alicdn.com')) {
      headers['Referer'] = 'https://detail.1688.com/';
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json();
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
    const useAiImages: boolean = !!body.useAiImages;
    if (productIds.length === 0) {
      return NextResponse.json({ error: '请先勾选商品' }, { status: 400 });
    }

    const zip = new JSZip();
    let folders = 0;
    let totalImages = 0;

    for (const pid of productIds) {
      const product = getProductById(pid);
      if (!product) continue;

      // 详情图按位置替换为 AI 增强版（与导出 Excel 同款逻辑）
      const genMap = new Map(
        getImagesByProductId(product.id)
          .filter(g => g.generated_image_url)
          .map(g => [g.original_image_url, g.generated_image_url])
      );
      const descImages = (product.description_images || []).map(src =>
        useAiImages ? genMap.get(src) || src : src
      );
      if (descImages.length === 0) continue;

      const safeName = (product.name || 'product').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 40);
      const folder = `PA-${product.id.slice(0, 8).toUpperCase()}-${safeName}`;
      let idx = 0;

      // 批量下载（每批 5 张）
      const BATCH = 5;
      for (let i = 0; i < descImages.length; i += BATCH) {
        const batch = descImages.slice(i, i + BATCH);
        const bufs = await Promise.allSettled(batch.map(url => fetchImage(url)));
        bufs.forEach((r, j) => {
          const buf = r.status === 'fulfilled' ? r.value : null;
          if (buf) {
            idx++;
            zip.file(`${folder}/${idx}.${getFileExtension(descImages[i + j])}`, buf);
            totalImages++;
          }
        });
      }
      if (idx > 0) folders++;
    }

    if (folders === 0) {
      return NextResponse.json({ error: '所选商品都没有详情图' }, { status: 404 });
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="detail-images-${date}.zip"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
}
