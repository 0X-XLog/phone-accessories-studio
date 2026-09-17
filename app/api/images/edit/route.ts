import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { editImage } from '@/lib/image-ai';
import { uploadToR2, generateUploadKey } from '@/lib/r2';
import { getCost } from '@/lib/cost';
import { MAIN_IMAGE_PROMPTS } from '@/lib/prompts-3c';
import { createImage, createHistory, addProductCost } from '@/lib/db';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json();
    const { sourceImageBuffer, sourceImageUrl, preset, customPrompt, productId, quality } = body;

    if (!sourceImageUrl) {
      return NextResponse.json({ error: 'No source image URL provided' }, { status: 400 });
    }

    // Resolve prompt from preset or custom
    let prompt: string;
    let subType: string;
    if (customPrompt) {
      prompt = customPrompt;
      subType = 'custom';
    } else if (preset && MAIN_IMAGE_PROMPTS[preset as keyof typeof MAIN_IMAGE_PROMPTS]) {
      prompt = MAIN_IMAGE_PROMPTS[preset as keyof typeof MAIN_IMAGE_PROMPTS];
      subType = preset === 'white_bg' ? 'white_bg' : 'enhanced';
    } else {
      prompt = MAIN_IMAGE_PROMPTS.white_bg;
      subType = 'white_bg';
    }

    let size: '1024x1024' | '1536x1024' | '1024x1536' = '1024x1024';

    // Get image buffer
    let imageBuffer: Buffer;
    if (sourceImageBuffer) {
      imageBuffer = Buffer.from(sourceImageBuffer, 'base64');
    } else {
      const imgRes = await fetch(sourceImageUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to download source image (${imgRes.status})`);
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // Call OpenAI image edit
    const { b64Json } = await editImage({ imageBuffer, prompt, size, quality });

    // Upload to R2
    const pngBuffer = Buffer.from(b64Json, 'base64');
    const key = generateUploadKey('edited.png', 'pa-studio/generated');
    const result = await uploadToR2(pngBuffer, key, 'image/png');

    const cost = getCost('image_edit');

    // Record in database if productId provided
    if (productId) {
      createImage({
        product_id: productId,
        type: 'main_white',
        sub_type: subType,
        prompt,
        original_image_url: sourceImageUrl,
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
    }

    return NextResponse.json({
      url: result.url,
      key: result.key,
      cost,
      subType,
    });
  } catch (error) {
    console.error('Image edit error:', error);
    return NextResponse.json(
      { error: 'Image edit failed', message: String(error) },
      { status: 500 }
    );
  }
}
