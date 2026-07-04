import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { generateText } from '@/lib/text-ai';
import { getCost } from '@/lib/cost';
import {
  TITLE_TIKTOK_EN_PROMPT,
  TITLE_TIKTOK_MS_PROMPT,
  TITLE_TIKTOK_ZH_PROMPT,
  TITLE_TIKTOK_TH_PROMPT,
  buildTitlePrompt,
  parseTitleOutput,
} from '@/lib/prompts-3c';
import { updateProduct, createHistory, addProductCost } from '@/lib/db';

const TITLE_CONFIGS = {
  tiktok_en: { system: TITLE_TIKTOK_EN_PROMPT, field: 'title_tiktok_en' },
  tiktok_ms: { system: TITLE_TIKTOK_MS_PROMPT, field: 'title_tiktok_ms' },
  tiktok_zh: { system: TITLE_TIKTOK_ZH_PROMPT, field: 'title_tiktok_zh' },
  tiktok_th: { system: TITLE_TIKTOK_TH_PROMPT, field: 'title_tiktok_th' },
};

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { productId, name, category, brand, color, material, specs, keywords, sellingPoints, platforms } = body as any;

  try {
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const prompt = buildTitlePrompt(
      name || '',
      category || '',
      brand || '',
      color || '',
      material || '',
      specs || {},
      keywords || [],
      sellingPoints || []
    );

    // Determine which platforms to generate for
    const targetPlatforms = platforms || ['tiktok_en', 'tiktok_ms', 'tiktok_zh', 'tiktok_th'];
    const results: Record<string, string> = {};
    let totalCost = 0;

    // Generate titles sequentially with delay to avoid rate limits
    for (let i = 0; i < targetPlatforms.length; i++) {
      const platform = targetPlatforms[i];
      const config = TITLE_CONFIGS[platform as keyof typeof TITLE_CONFIGS];
      if (!config) continue;

      // Delay between requests (skip first)
      if (i > 0) {
        await new Promise(r => setTimeout(r, 3000));
      }

      const result = await generateText({
        prompt: `${prompt}\n\nOutput only the title text, nothing else.`,
        systemPrompt: config.system,
        maxTokens: 1000,
        temperature: 0.7,
      });

      results[config.field] = parseTitleOutput(result);
    }
    totalCost = getCost('title') * targetPlatforms.length;

    // Update product
    updateProduct(productId, {
      ...results,
      status: 'generated',
    });

    // Record history
    createHistory({
      product_id: productId,
      type: 'title',
      model: process.env.TEXT_MODEL || '',
      cost_usd: totalCost,
      status: 'success',
    });

    addProductCost(productId, totalCost);

    return NextResponse.json({ titles: results, cost: totalCost });
  } catch (error) {
    console.error('Title generation error:', error);

    if (body.productId) {
      createHistory({
        product_id: body.productId as string,
        type: 'title',
        model: process.env.TEXT_MODEL || '',
        cost_usd: 0,
        status: 'failed',
        error_message: String(error),
      });
    }

    return NextResponse.json(
      { error: 'Title generation failed', message: String(error) },
      { status: 500 }
    );
  }
}
