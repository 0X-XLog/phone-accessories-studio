import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProductById, getImagesByProductId, getTiktokShops } from '@/lib/db';
import { getCategoryTree } from '@/lib/tiktok-api';
import { matchTiktokCategories } from '@/lib/tiktok-categories';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

// Build product description HTML (same pattern as push route)
function buildDescriptionHtml(product: { description_long?: string; description_bullets?: string[] }): string {
  const parts: string[] = [];
  (product.description_long || '').split('\n').filter(Boolean).forEach(line => parts.push(`<p>${line}</p>`));
  const bullets = product.description_bullets || [];
  if (bullets.length) parts.push('<ul>' + bullets.filter(Boolean).map(b => `<li>${b}</li>`).join('') + '</ul>');
  return parts.join('');
}

// Resolve images: position-based AI replacement, joined for spreadsheet cell
function resolveImages(
  product: { id: string; original_images?: string[]; original_image_sources?: string[] },
  genMap: Map<string, string>,
  useAiImages: boolean
): string[] {
  const baseImages = product.original_images || [];
  const sources = (product.original_image_sources?.length ? product.original_image_sources : baseImages) || [];
  const images = useAiImages
    ? sources.map((src, i) => (baseImages[i] ? genMap.get(baseImages[i]) || src : src))
    : sources;
  return images.slice(0, 9);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json();
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
    const useAiImages: boolean = !!body.useAiImages;
    const titleField: string = body.titleField || 'name';
    if (productIds.length === 0) {
      return NextResponse.json({ error: '请先勾选要导出的商品' }, { status: 400 });
    }

    // 类目提示需要类目树；未授权店铺时留空让用户手填
    let tree: Awaited<ReturnType<typeof getCategoryTree>> | null = null;
    const shop = getTiktokShops().find(s => s.status === 'active');
    if (shop) {
      try { tree = await getCategoryTree(shop); } catch { /* 类目提示尽力而为 */ }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');
    sheet.columns = [
      { header: 'Product Name', key: 'name', width: 40 },
      { header: 'Category (TikTok)', key: 'category', width: 30 },
      { header: 'Description (HTML)', key: 'description', width: 80 },
      { header: 'Main Image URLs (用|分隔)', key: 'images', width: 70 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Seller SKU', key: 'sku', width: 18 },
      { header: 'Package Weight (g)', key: 'weight', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };

    const missing: string[] = [];
    for (const pid of productIds) {
      const product = getProductById(pid);
      if (!product) continue;

      const genMap = new Map(
        getImagesByProductId(product.id)
          .filter(g => g.generated_image_url)
          .map(g => [g.original_image_url, g.generated_image_url])
      );
      const images = resolveImages(product, genMap, useAiImages);
      const title = titleField !== 'name'
        ? (product as unknown as Record<string, string>)[titleField] || product.name
        : product.name;

      let categoryHint = '';
      if (tree) {
        const matches = matchTiktokCategories(product.category || 'other', tree);
        if (matches.length > 0) categoryHint = `${matches[0].name} (id: ${matches[0].id})`;
      }
      if (!categoryHint) categoryHint = product.category || '';

      sheet.addRow({
        name: title,
        category: categoryHint,
        description: buildDescriptionHtml(product),
        images: images.join('|'),
        price: '',
        stock: 99,
        sku: `PA-${product.id.slice(0, 8).toUpperCase()}`,
        weight: 200,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="tiktok-import-${date}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
}
