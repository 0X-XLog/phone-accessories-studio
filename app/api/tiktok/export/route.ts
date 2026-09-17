import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProductById, getImagesByProductId } from '@/lib/db';
import ExcelJS from 'exceljs';
import { CATEGORIES } from '@/lib/categories';

export const runtime = 'nodejs';

const TEMPLATE_PATH = path.join(process.cwd(), 'data', 'tiktok-template-MY.xlsx');

// 我们 22 类目 → 官方模板 Category 表（MY 店可用类目，格式: 全路径名 (id)）
const CATEGORY_MAP: Record<string, string> = {
  phone_case: '手机配件/保护壳、屏幕保护膜、皮肤 (601925)',
  screen_protector: '手机配件/保护壳、屏幕保护膜、皮肤 (601925)',
  earbuds: '影音设备/耳机 (601990)',
  earbuds_case: '影音设备/耳机 (601990)',
  cable: '手机配件/充电线、充电器 & 转换器 (601937)',
  charger: '手机配件/充电线、充电器 & 转换器 (601937)',
  wireless_charger: '手机配件/充电线、充电器 & 转换器 (601937)',
  usb_hub: '手机配件/充电线、充电器 & 转换器 (601937)',
  power_bank: '手机配件/移动电源 (910728)',
  holder: '手机配件/手机支架 (910344)',
  stand: '手机配件/手机支架 (910344)',
  car_mount: '手机配件/手机支架 (910344)',
  phone_ring: '手机配件/手机支架 (910344)',
  phone_lanyard: '手机配件/手机挂绳与挂件 (601936)',
  fan: '通用配件/USB风扇 (990728)',
  stylus: '平板电脑配件/平板电脑触摸笔 (992264)',
  phone_pouch: '手机配件/保护壳、屏幕保护膜、皮肤 (601925)',
  tablet_case: '平板电脑配件/平板电脑保护套/壳 (991496)',
  smart_watch: '智能及穿戴设备/智能手表 & 手环 (602083)',
  smart_band: '智能及穿戴设备/智能手环 (914056)',
  cleaning_kit: '手机配件/手机零部件 (909832)',
  other: '手机配件/手机零部件 (909832)',
};

function resolveCategoryCell(category: string): string {
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];
  // 兼容手工创建时存了英文名的商品：反查类目 id 再映射
  const c = CATEGORIES.find(x => x.id === category || x.nameEn.toLowerCase() === category.toLowerCase());
  if (c && CATEGORY_MAP[c.id]) return CATEGORY_MAP[c.id];
  return CATEGORY_MAP['other'];
}

function buildDescriptionHtml(product: { description_long?: string; description_bullets?: string[] }): string {
  const parts: string[] = [];
  (product.description_long || '').split('\n').filter(Boolean).forEach(line => parts.push(`<p>${line}</p>`));
  const bullets = product.description_bullets || [];
  if (bullets.length) parts.push('<ul>' + bullets.filter(Boolean).map(b => `<li>${b}</li>`).join('') + '</ul>');
  return parts.join('');
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json();
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
    const useAiImages: boolean = !!body.useAiImages;
    const titleField: string = body.titleField || 'title_tiktok_en';
    // 建议零售价 = 1688成本价(CNY) × 汇率 × 加价倍数；可在页面调
    const rate: number = Number(body.rate) > 0 ? Number(body.rate) : 0.65;
    const markup: number = Number(body.markup) > 0 ? Number(body.markup) : 2.5;
    if (productIds.length === 0) {
      return NextResponse.json({ error: '请先勾选要导出的商品' }, { status: 400 });
    }
    if (!fs.existsSync(TEMPLATE_PATH)) {
      return NextResponse.json({ error: '官方模板文件缺失（data/tiktok-template-MY.xlsx）' }, { status: 500 });
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(TEMPLATE_PATH);
    const sheet = wb.getWorksheet('Template');
    if (!sheet) return NextResponse.json({ error: '模板缺少 Template 工作表' }, { status: 500 });

    // 模板第 6 行是官方示例、第 7 行是残留提示——清掉，数据从第 6 行开始写
    sheet.getRow(6).values = [];
    sheet.getRow(7).values = [];

    let rowIndex = 6;
    let exported = 0;
    for (const pid of productIds) {
      const product = getProductById(pid);
      if (!product) continue;

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

      const title = titleField !== 'name'
        ? (product as unknown as Record<string, string>)[titleField] || product.name
        : product.name;

      const row = sheet.getRow(rowIndex);
      row.getCell(1).value = resolveCategoryCell(product.category || '');
      // col2 品牌：留空 = 无品牌（官方说明）
      row.getCell(3).value = title;
      row.getCell(4).value = buildDescriptionHtml(product);
      images.forEach((url, i) => { row.getCell(5 + i).value = url; }); // cols 5..13 主图+图2-9
      row.getCell(19).value = 200; // 包裹重量(g)
      row.getCell(20).value = 20;  // 长(cm)
      row.getCell(21).value = 15;  // 宽(cm)
      row.getCell(22).value = 5;   // 高(cm)
      // col23 零售价：有成本价则按 汇率×倍数 生成建议价，否则留空手填
      if ((product.cost_price || 0) > 0) {
        row.getCell(23).value = Math.round(product.cost_price * rate * markup * 100) / 100;
      }
      row.getCell(24).value = product.stock ?? 99;  // 数量
      row.getCell(25).value = `PA-${product.id.slice(0, 8).toUpperCase()}`; // 商家 SKU
      row.commit();
      rowIndex++;
      exported++;
    }

    if (exported === 0) {
      return NextResponse.json({ error: '所选商品均不存在' }, { status: 400 });
    }

    const buffer = await wb.xlsx.writeBuffer();
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
