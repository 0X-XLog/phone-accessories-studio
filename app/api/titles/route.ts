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
import { updateProduct, createHistory, addProductCost, getProductById } from '@/lib/db';
import { buildStructuredMsTitlePrompt, MS_STRUCTURED_SYSTEM_PROMPT, validateTitle } from '@/lib/title-system';

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
  const { productId, name, category: category_raw, brand, color, material, specs, keywords, sellingPoints, platforms } = body as any;

  try {
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const product = getProductById(productId);
    const category = (category_raw || product?.category || 'other') as string;
    const specText = (product?.original_notes_html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);

    const prompt = buildTitlePrompt(
      name || '',
      category,
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

      let genPrompt = `${prompt}\n\nOutput only the title text, nothing else.`;
      let systemPrompt = config.system;
      let temperature = 0.7;
      if (platform === 'tiktok_ms') {
        // 结构化标题系统：类目模板填空，只准用真实数据
        genPrompt = buildStructuredMsTitlePrompt({
          category,
          name: name || product?.name || '',
          brand: brand || product?.brand || '',
          specsText: specText,
          description: (product?.description_long || '').slice(0, 600),
          analysis: JSON.stringify(product?.ai_analysis || {}).slice(0, 600),
          sellingPoints: sellingPoints || [],
          attributes: (product?.ai_analysis as Record<string, unknown> | undefined)?.attributes as Record<string, unknown> | undefined,
        });
        systemPrompt = MS_STRUCTURED_SYSTEM_PROMPT;
        temperature = 0.5;
      }

      const result = await generateText({
        prompt: genPrompt,
        systemPrompt,
        maxTokens: 1000,
        temperature,
      });

      let v = validateTitle(parseTitleOutput(result));
      // 超长自动缩短：带反馈重新生成一次（模型数不准字数，重试比说教有效）
      if (v.cleaned.length > 90 && platform === 'tiktok_ms') {
        console.log(`[TITLE] ${platform} ${v.cleaned.length} 字符超长，自动缩短重试`);
        const shortenPrompt = `The following Bahasa Melayu product title is ${v.cleaned.length} characters — TOO LONG.

"${v.cleaned}"

Rewrite it to at most 85 characters. Keep: the core product word at the start, the most important spec, and the English keyword at the end. REMOVE secondary feature slots first (battery/extra compatibility/one adjective). Output ONLY the shortened title.`;
        try {
          const r2 = await generateText({
            prompt: shortenPrompt,
            systemPrompt: systemPrompt,
            maxTokens: 1000,
            temperature: 0.4,
          });
          const v2 = validateTitle(parseTitleOutput(r2));
          if (v2.cleaned.length <= 90 && v2.cleaned.length >= 40) v = v2;
        } catch { /* 缩短失败时保留原标题 */ }
        if (v.cleaned.length > 90) {
          // 最后手段：按词边界硬截断到 90
          const cut = v.cleaned.slice(0, 90);
          v.cleaned = cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : 90).trim();
          v.issues.push('已硬截断至 90 字符');
        }
      }
      if (v.issues.length) console.log(`[TITLE] ${platform} 校验: ${v.issues.join(' | ')}`);
      results[config.field] = v.cleaned;
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
