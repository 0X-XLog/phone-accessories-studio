import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProductById, getImagesByProductId, getTiktokShops, updateTiktokShopTokens, createHistory } from '@/lib/db';
import { setTokenPersister, uploadImageFromUrl, getCategoryTree, createProductDraft, publishProduct } from '@/lib/tiktok-api';
import { matchTiktokCategories } from '@/lib/tiktok-categories';

setTokenPersister(updateTiktokShopTokens);

const CURRENCY_BY_SITE: Record<string, string> = {
  MY: 'MYR', TH: 'THB', PH: 'PHP', VN: 'VND', SG: 'SGD', ID: 'IDR', GB: 'GBP', US: 'USD',
};

// Build product description HTML from AI-generated long description + bullets
function buildDescriptionHtml(product: { description_long?: string; description_bullets?: string[] }): string {
  const parts: string[] = [];
  (product.description_long || '').split('\n').filter(Boolean).forEach(line => {
    parts.push(`<p>${line}</p>`);
  });
  const bullets = product.description_bullets || [];
  if (bullets.length) {
    parts.push('<ul>' + bullets.filter(Boolean).map(b => `<li>${b}</li>`).join('') + '</ul>');
  }
  return parts.join('') || '<p></p>';
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  let productId = '';
  try {
    const body = await request.json();
    productId = body.productId || '';
    const { shopId, titleField, price, stock, useAiImages, categoryId, publish } = body;

    const product = getProductById(productId);
    if (!product) return NextResponse.json({ error: '商品不存在' }, { status: 404 });

    const shops = getTiktokShops().filter(s => s.status === 'active');
    if (shops.length === 0) {
      return NextResponse.json({ error: '还没有已授权的 TikTok 店铺，请先到「TikTok 店铺」页完成授权' }, { status: 400 });
    }
    const shop = shops.find(s => s.id === shopId) || shops[0];

    if (!price) return NextResponse.json({ error: '请填写售价' }, { status: 400 });

    // --- 标题 ---
    const title = titleField && titleField !== 'name'
      ? (product as unknown as Record<string, string>)[titleField] || product.name
      : product.name;

    // --- 主图：按位置用 AI 增强图替换（与妙手同步同款逻辑），TikTok 限 9 张 ---
    const genMap = new Map(
      getImagesByProductId(product.id)
        .filter(g => g.generated_image_url)
        .map(g => [g.original_image_url, g.generated_image_url])
    );
    const baseImages = product.original_images || [];
    const sources = (product.original_image_sources?.length ? product.original_image_sources : baseImages) || [];
    const images = (useAiImages
      ? sources.map((src: string, i: number) => (baseImages[i] ? genMap.get(baseImages[i]) || src : src))
      : sources
    ).slice(0, 9);

    if (images.length === 0) {
      return NextResponse.json({ error: '商品没有主图，请先导入或生成图片' }, { status: 400 });
    }

    // --- 类目：指定 id 或按我们的类目自动匹配 TikTok 叶子类目 ---
    let finalCategoryId: string = categoryId || '';
    if (!finalCategoryId) {
      const tree = await getCategoryTree(shop);
      const matches = matchTiktokCategories(product.category || 'other', tree);
      if (matches.length === 0) {
        return NextResponse.json({ error: `无法自动匹配 TikTok 类目（商品类目: ${product.category || '空'}），请手动选择类目后重试` }, { status: 400 });
      }
      finalCategoryId = matches[0].id;
    }

    // --- 上传图片到 TikTok 媒体库（逐张）---
    const uris: string[] = [];
    for (const url of images) {
      uris.push(await uploadImageFromUrl(shop, url));
    }

    // --- 创建商品草稿 ---
    const result = await createProductDraft(shop, {
      categoryId: finalCategoryId,
      name: title,
      descriptionHtml: buildDescriptionHtml(product),
      imageUris: uris,
      price: String(price),
      currency: CURRENCY_BY_SITE[shop.site] || 'MYR',
      stock: Number(stock) > 0 ? Number(stock) : 99,
    });

    let published = false;
    if (publish) {
      await publishProduct(shop, result.product_id);
      published = true;
    }

    createHistory({
      product_id: product.id,
      type: 'tiktok_push',
      model: 'tiktok-open-api',
      status: 'success',
    });

    return NextResponse.json({
      ok: true,
      tiktok_product_id: result.product_id,
      published,
      imageCount: uris.length,
      categoryId: finalCategoryId,
    });
  } catch (error) {
    const msg = String(error instanceof Error ? error.message : error);
    if (productId) {
      try {
        createHistory({ product_id: productId, type: 'tiktok_push', model: 'tiktok-open-api', status: 'failed', error_message: msg.slice(0, 500) });
      } catch { /* history logging is best-effort */ }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
