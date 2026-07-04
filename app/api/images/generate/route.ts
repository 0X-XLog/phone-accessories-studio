import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { editImage } from '@/lib/image-ai';
import { uploadToR2, generateUploadKey } from '@/lib/r2';
import { getCost } from '@/lib/cost';
import { SCENE_PROMPTS, SELLING_POINT_IMAGE_PROMPTS } from '@/lib/categories';
import { createImage, createHistory, addProductCost, getProductById } from '@/lib/db';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  let productId = '';
  try {
    const { productId: pid, originalImageUrl, type, subType, customPrompt, category, sourceImageBuffer } = await request.json();
    productId = pid;
    console.log('[IMG-GEN] type:', type, '| productId:', productId, '| url:', originalImageUrl?.slice(0, 80));

    if (!productId || !originalImageUrl) {
      return NextResponse.json({ error: 'Missing productId or originalImageUrl' }, { status: 400 });
    }

    let prompt: string;
    let imageType: string;
    let size: '1024x1024' | '1536x1024' | '1024x1536' = '1024x1024';

    if (customPrompt) {
      prompt = customPrompt;
      imageType = type || 'main_white';
    } else if (type === 'enhance') {
      // Batch enhance: let AI decide per image — remove watermarks, optionally add English labels
      const productData = getProductById(productId);
      const sellingPoints: string[] = productData?.selling_points || [];
      const bullets: string[] = productData?.description_bullets || [];
      const allPoints = [...sellingPoints, ...bullets]
        .map((p: string) => p.replace(/\*\*/g, '').trim())
        .filter(Boolean)
        .slice(0, 6);

      const pointsHint = allPoints.length > 0
        ? `Useful selling points for replacement (if needed): ${allPoints.join(', ')}`
        : '';

      prompt = `You are an e-commerce product photo editor. Look at this image carefully and follow these rules:

1. ALWAYS: Enhance to HD quality — improve sharpness, brightness, contrast, color vibrancy. Professional lighting.

2. If the image has Chinese text, watermarks, or overlay graphics:
   - Remove ALL of them cleanly
   - If any text was a useful selling point label/badge (e.g. "防摔", "正品", "高清"), you MAY replace it with a concise English equivalent in a clean sans-serif font
   - Place replacement text ONLY in empty/margin areas (background, corners, bottom strip) — NEVER on the product surface itself

3. If the image has NO text overlays at all:
   - Just enhance quality, do NOT add any text or graphics

4. NEVER place any text, logo, or graphic directly ON the product surface (e.g. on a phone case body, on the product itself). Text goes only in background/margin areas.

5. Keep the product shape, color, texture, and details completely untouched.

${pointsHint}
Output the enhanced image only, no changes to product appearance.`;
      imageType = 'main_white';
    } else if (type === 'scene' && category && SCENE_PROMPTS[category]) {
      const scenes = SCENE_PROMPTS[category];
      const idx = parseInt(subType) || 0;
      prompt = scenes[Math.min(idx, scenes.length - 1)];
      imageType = 'scene';
      size = '1536x1024';
    } else if (type === 'selling_point' && category && SELLING_POINT_IMAGE_PROMPTS[category]) {
      const pointPrompts = SELLING_POINT_IMAGE_PROMPTS[category];
      if (subType && pointPrompts[subType]) {
        prompt = pointPrompts[subType];
      } else {
        const keys = Object.keys(pointPrompts);
        prompt = pointPrompts[keys[0]];
      }
      imageType = 'selling_point';
    } else if (type === 'main_white') {
      const { MAIN_IMAGE_PROMPTS } = await import('@/lib/prompts-3c');
      prompt = subType === 'enhanced' ? MAIN_IMAGE_PROMPTS.enhanced : MAIN_IMAGE_PROMPTS.white_bg;
      imageType = 'main_white';
    } else {
      prompt = customPrompt || 'Professional product photography on clean white background, high quality e-commerce image';
      imageType = type || 'main_white';
    }

    // Download source image
    let imageBuffer: Buffer;
    if (sourceImageBuffer) {
      imageBuffer = Buffer.from(sourceImageBuffer, 'base64');
    } else {
      console.log('[IMG-GEN] Downloading source image...');
      const fetchHeaders: Record<string, string> = {};
      if (originalImageUrl.includes('1688.com') || originalImageUrl.includes('alicdn.com')) {
        fetchHeaders['Referer'] = 'https://detail.1688.com/';
      }
      const imgRes = await fetch(originalImageUrl, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(30000),
      });
      if (!imgRes.ok) {
        throw new Error(`Failed to download source image: HTTP ${imgRes.status} from ${originalImageUrl.slice(0, 100)}`);
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      console.log('[IMG-GEN] Image downloaded, size:', (arrayBuffer.byteLength / 1024).toFixed(0), 'KB');
    }

    // Call OpenAI
    console.log('[IMG-GEN] Calling image API, prompt length:', prompt.length);
    const { b64Json } = await editImage({ imageBuffer, prompt, size });
    console.log('[IMG-GEN] Image API returned, b64Json length:', b64Json.length);

    // Upload to R2
    console.log('[IMG-GEN] Uploading to R2...');
    const pngBuffer = Buffer.from(b64Json, 'base64');
    const key = generateUploadKey('generated.png', 'pa-studio/generated');
    const result = await uploadToR2(pngBuffer, key, 'image/png');
    console.log('[IMG-GEN] R2 uploaded:', result.url);

    const cost = getCost('image_generate');

    // Save records
    console.log('[IMG-GEN] Saving to SQLite...');
    createImage({
      product_id: productId,
      type: imageType,
      sub_type: subType || '',
      prompt,
      original_image_url: originalImageUrl,
      generated_image_url: result.url,
    });
    createHistory({
      product_id: productId,
      type: 'image_edit',
      model: process.env.IMAGE_MODEL || '',
      cost_usd: cost,
      status: 'success',
    });
    addProductCost(productId, cost);
    console.log('[IMG-GEN] Saved successfully');

    return NextResponse.json({
      url: result.url,
      key: result.key,
      cost,
      type: imageType,
      sub_type: subType || '',
    });
  } catch (error) {
    console.error('Image generate error:', error);

    if (productId) {
      createHistory({
        product_id: productId,
        type: 'image_edit',
        model: process.env.IMAGE_MODEL || '',
        cost_usd: 0,
        status: 'failed',
        error_message: String(error),
      });
    }

    return NextResponse.json(
      { error: 'Image generation failed', message: String(error) },
      { status: 500 }
    );
  }
}
