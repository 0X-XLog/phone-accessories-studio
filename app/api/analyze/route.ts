import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { generateText } from '@/lib/text-ai';
import { getCost } from '@/lib/cost';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, parseAnalysisOutput } from '@/lib/prompts-3c';
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
  const { productId, name, category, brand, color, material, sellingPoints, images } = body as any;

  try {
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const prompt = buildAnalysisPrompt(
      name || '',
      category || '',
      brand || '',
      color || '',
      material || '',
      sellingPoints || []
    );

    const result = await generateText({
      prompt,
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      maxTokens: 3000,
      temperature: 0.5,
      images: images && images.length > 0 ? images : undefined,
    });

    const analysis = parseAnalysisOutput(result);
    const cost = getCost('analysis');

    updateProduct(productId, {
      ai_analysis: analysis,
      status: 'analyzed',
    });

    createHistory({
      product_id: productId,
      type: 'analysis',
      model: process.env.TEXT_MODEL || '',
      cost_usd: cost,
      status: 'success',
    });

    addProductCost(productId, cost);

    return NextResponse.json({ analysis, cost });
  } catch (error) {
    console.error('Analysis error:', error);

    if (body.productId) {
      createHistory({
        product_id: body.productId as string,
        type: 'analysis',
        model: process.env.TEXT_MODEL || '',
        cost_usd: 0,
        status: 'failed',
        error_message: String(error),
      });
    }

    return NextResponse.json(
      { error: 'Analysis failed', message: String(error) },
      { status: 500 }
    );
  }
}
