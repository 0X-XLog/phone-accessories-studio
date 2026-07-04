import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { generateText } from '@/lib/text-ai';
import { getCost } from '@/lib/cost';
import {
  DESCRIPTION_SYSTEM_PROMPT,
  DESCRIPTION_SYSTEM_PROMPT_MS,
  DESCRIPTION_SYSTEM_PROMPT_ZH,
  DESCRIPTION_SYSTEM_PROMPT_TH,
  buildDescriptionPrompt,
  parseDescriptionOutput,
} from '@/lib/prompts-3c';

const DESC_LANG_PROMPTS: Record<string, string> = {
  en: DESCRIPTION_SYSTEM_PROMPT,
  ms: DESCRIPTION_SYSTEM_PROMPT_MS,
  zh: DESCRIPTION_SYSTEM_PROMPT_ZH,
  th: DESCRIPTION_SYSTEM_PROMPT_TH,
};
import { updateProduct, createHistory, addProductCost } from '@/lib/db';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { productId, name, category, brand, color, material, specs, keywords, sellingPoints, platform, aiAnalysis, lang } = body as any;
  console.log('[DESC] name:', name, '| category:', category, '| brand:', brand, '| keywords:', keywords?.length, '| sellingPoints:', sellingPoints?.length, '| aiAnalysis:', !!aiAnalysis);

  try {
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const prompt = buildDescriptionPrompt(
      name || '',
      category || '',
      brand || '',
      color || '',
      material || '',
      specs || {},
      keywords || [],
      sellingPoints || [],
      aiAnalysis || undefined
    );

    const systemPrompt = DESC_LANG_PROMPTS[lang || 'en'] || DESCRIPTION_SYSTEM_PROMPT;

    const result = await generateText({
      prompt,
      systemPrompt,
      maxTokens: 4000,
      temperature: 0.7,
    });
    console.log('[DESC] prompt length:', prompt.length);
    console.log('[DESC] system prompt includes Chinese:', DESCRIPTION_SYSTEM_PROMPT.includes('Chinese'));
    console.log('[DESC] result length:', result.length, '| first 200:', result.slice(0, 200));

    const parsed = parseDescriptionOutput(result);
    const storeDesc = parsed.long || '';

    const cost = getCost('description');

    updateProduct(productId, {
      description_short: parsed.short || '',
      description_long: storeDesc,
      description_bullets: parsed.bullets || [],
      description_specs: parsed.specs || {},
      description_faq: parsed.faq || [],
      status: 'generated',
    });

    createHistory({
      product_id: productId,
      type: 'description',
      model: process.env.TEXT_MODEL || '',
      cost_usd: cost,
      status: 'success',
    });

    addProductCost(productId, cost);

    return NextResponse.json({
      short: parsed.short,
      long: storeDesc,
      bullets: parsed.bullets,
      specs: parsed.specs,
      faq: parsed.faq,
      cost,
    });
  } catch (error) {
    console.error('Description generation error:', error);

    if (body.productId) {
      createHistory({
        product_id: body.productId as string,
        type: 'description',
        model: process.env.TEXT_MODEL || '',
        cost_usd: 0,
        status: 'failed',
        error_message: String(error),
      });
    }

    return NextResponse.json(
      { error: 'Description generation failed', message: String(error) },
      { status: 500 }
    );
  }
}
