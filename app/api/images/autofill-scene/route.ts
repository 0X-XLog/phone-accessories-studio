import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProductById, getImagesByProductId, createImage, createHistory, addProductCost } from '@/lib/db';
import { editImage } from '@/lib/image-ai';
import { uploadToR2, generateUploadKey } from '@/lib/r2';
import { SCENE_PROMPTS } from '@/lib/categories';
import { getCost } from '@/lib/cost';

export const runtime = 'nodejs';

// 图集不足 9 张时，自动生成符合产品使用环境的场景图补齐（3 车道并行）
// 场景图会随后续 Excel 导出自动并入图集空位
const GENERIC_SCENES = (productType: string) => [
  `Lifestyle photo: ${productType} being used naturally by a person, warm natural lighting, realistic hands, shallow depth of field. HD quality. Keep the product exactly as-is, remove any Chinese text or watermarks.`,
  `Product on a modern desk setup with laptop and accessories, soft daylight from window, clean aesthetic composition. HD quality. Keep the product exactly as-is, remove any Chinese text or watermarks.`,
  `Product in a car interior environment (dashboard or seat), daylight, realistic travel/commute context. HD quality. Keep the product exactly as-is, remove any Chinese text or watermarks.`,
  `Cozy home lifestyle scene with the product on a wooden table, plants and warm tones in background. HD quality. Keep the product exactly as-is, remove any Chinese text or watermarks.`,
  `Outdoor lifestyle photo with the product, natural sunlight, greenery or urban background, energetic feel. HD quality. Keep the product exactly as-is, remove any Chinese text or watermarks.`,
];

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  let productId = '';
  try {
    const body = await request.json();
    productId = body.productId || '';
    const quality: string = body.quality || 'low';
    const product = getProductById(productId);
    if (!product) return NextResponse.json({ error: '商品不存在' }, { status: 404 });

    // 当前图集容量 = 原始主图 + 已生成的卖点/场景图
    const genImages = getImagesByProductId(product.id);
    const extraCount = genImages.filter(g => g.type === 'selling_point' || g.type === 'scene').length;
    const galleryCount = (product.original_images || []).length + extraCount;
    const shortfall = Math.max(0, 9 - galleryCount);
    if (shortfall === 0) {
      return NextResponse.json({ ok: true, generated: 0, note: '图集已有 9 张，无需补图' });
    }

    // 源参考图（第一张主图，保持产品一致性）
    const baseImages = product.original_images || [];
    const sourceUrl = baseImages[0] || (product.original_image_sources || [])[0];
    if (!sourceUrl) return NextResponse.json({ error: '商品没有主图，无法生成场景图' }, { status: 400 });
    const srcRes = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
    if (!srcRes.ok) throw new Error(`源图下载失败 ${srcRes.status}`);
    const imageBuffer = Buffer.from(await srcRes.arrayBuffer());

    // 场景提示词：优先类目词库，否则通用场景模板
    const productType = (product.ai_analysis as Record<string, unknown>)?.productType as string || product.name;
    const scenePool: string[] = SCENE_PROMPTS[product.category] || GENERIC_SCENES(productType);

    const lanes = Math.min(3, shortfall);
    const urls: string[] = [];
    let done = 0;
    for (let i = 0; i < shortfall; i += lanes) {
      const chunk = Array.from({ length: Math.min(lanes, shortfall - i) }, (_, j) => i + j);
      const results = await Promise.allSettled(chunk.map((idx, j) => (async () => {
        const prompt = scenePool[idx % scenePool.length];
        const { b64Json } = await editImage({ imageBuffer, prompt, size: '1536x1024', quality, lane: j });
        const pngBuffer = Buffer.from(b64Json, 'base64');
        const key = generateUploadKey('scene.png', 'pa-studio/scene');
        const uploaded = await uploadToR2(pngBuffer, key, 'image/png');
        createImage({
          product_id: product.id,
          type: 'scene',
          sub_type: String(idx),
          prompt,
          original_image_url: sourceUrl,
          generated_image_url: uploaded.url,
        });
        return uploaded.url;
      })()));
      results.forEach(r => {
        if (r.status === 'fulfilled') { urls.push(r.value); done++; }
      });
    }

    const cost = getCost('image_generate') * done;
    createHistory({
      product_id: product.id,
      type: 'image_edit',
      model: process.env.IMAGE_MODEL || '',
      cost_usd: cost,
      status: done > 0 ? 'success' : 'failed',
      error_message: done < shortfall ? `补图 ${done}/${shortfall} 成功` : '',
    });
    if (done > 0) addProductCost(product.id, cost);

    return NextResponse.json({
      ok: true,
      generated: done,
      shortfallBefore: shortfall,
      galleryAfter: galleryCount + done,
      urls,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
}
