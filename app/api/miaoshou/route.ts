import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAdmin } from '@/lib/verify-admin';
import { uploadToR2, generateUploadKey } from '@/lib/r2';
import { detectCategoryFromTitle, detectCategoryFromMiaoshou } from '@/lib/categories';
import { updateProduct } from '@/lib/db';

const APP_KEY = process.env.MIAOSHOU_APP_KEY || '';
const APP_SECRET = process.env.MIAOSHOU_APP_SECRET || '';
const BASE_URL = 'https://openapi-erp.91miaoshou.com';

function sign(path: string, timestamp: string, body: string): string {
  const message = APP_SECRET + path + timestamp + APP_KEY + body + APP_SECRET;
  return crypto.createHmac('sha256', APP_SECRET).update(message).digest('hex');
}

async function callMiaoshou(path: string, body: Record<string, unknown> = {}) {
  const bodyStr = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign(path, timestamp, bodyStr);

  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-key': APP_KEY,
      'x-timestamp': timestamp,
      'x-sign': signature,
    },
    body: bodyStr,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Miaoshou API error: ${res.status}`);
  }

  const data = await res.json();
  if (data.result === 'fail') {
    throw new Error(data.message || data.code || 'Miaoshou API failed');
  }
  return data.data;
}

// Download 1688/alicdn image and upload to R2
async function downloadImageToR2(imgUrl: string, index: number): Promise<string | null> {
  const normalizeUrl = (url: string) => (url.startsWith('//') ? 'https:' + url : url);
  const baseUrl = normalizeUrl(imgUrl).split('?')[0];

  // Try HD first (remove -0-cib thumbnail suffix), then original
  const candidates = Array.from(
    new Set([
      baseUrl.replace(/-0-cib\.(jpg|jpeg|png|webp)$/i, '.$1'),
      baseUrl,
    ])
  );

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: {
          Referer: 'https://detail.1688.com/',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : 'jpg';
      const key = generateUploadKey(`ms-img-${index}.${ext}`, 'pa-studio/1688');
      const result = await uploadToR2(buffer, key, contentType);
      return result.url;
    } catch {
      // try next candidate
    }
  }
  return null;
}

// Clean 1688 title
function cleanTitle(title: string): string {
  let cleaned = title;
  const brandList = [
    'oppo','vivo','小米','华为','三星','苹果','iphone','ipad','荣耀','红米',
    '一加','realme','iqoo','魅族','努比亚','联想','中兴','索尼','lg','htc',
    '诺基亚','pixel','galaxy','asus','华硕','惠普','hp','lenovo','dell','微软',
    'surface','摩托罗拉','酷派','金立','锤子','黑莓',
  ];
  const brandsPattern = brandList.join('|');
  const lowerTitle = cleaned.toLowerCase();
  const foundBrands = brandList.filter((b) => lowerTitle.includes(b.toLowerCase()));

  if (foundBrands.length >= 2) {
    cleaned = cleaned.replace(
      new RegExp(
        `[\\/、,，\\s]*(?:通用|适用|适配|适合|兼容|for)\\s*[\\/、,，\\s]*(?:${brandsPattern})[\\/、,，\\s]*(?:${brandsPattern})[\\/、,，\\s\\u4e00-\\u9fff]*通用?`,
        'gi'
      ),
      ''
    );
    cleaned = cleaned.replace(
      new RegExp(
        `(?:${brandsPattern})[\\/、,，\\s]*(?:${brandsPattern})(?:[\\/、,，\\s]*(?:${brandsPattern}))*`,
        'gi'
      ),
      ''
    );
    cleaned = cleaned.replace(/\s*(?:通用|适用于|适配于|适合于|兼容于|for)\s*/gi, ' ');
    cleaned = cleaned.replace(/(^|\s)适用(\s|$)/g, '$1$2');
  } else if (foundBrands.length === 1) {
    cleaned = cleaned.replace(
      new RegExp(
        `(?:适用|适配|for)\\s*于?\\s*[\\/、,，]?\\s*(?:${brandsPattern})[^\\u4e00-\\u9fff]{0,10}`,
        'gi'
      ),
      ''
    );
    cleaned = cleaned.replace(/\s*通用\s*/g, ' ');
  }

  cleaned = cleaned.replace(
    /(?:工厂直销|批发|一件代发|跨境专供|爆款|热销|新款上市|厂家直供|源头工厂|大量现货|源头厂家|支持混批|七天退换)[\/、,，\s]*/gi,
    ''
  );
  cleaned = cleaned.replace(/[\s\/、,，]{2,}/g, ' ');
  cleaned = cleaned.replace(/^[\s\/、,，]+|[\s\/、,，]+$/g, '');
  return cleaned.trim();
}

// GET: list collect box items (auto-paginate to fetch all)
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const PAGE_SIZE = 200;
    let allItems: Array<Record<string, unknown>> = [];
    let pageNo = 1;

    // Fetch all pages
    while (true) {
      const data = await callMiaoshou(
        '/open/v1/product/common_collect_box/common_collect_box/get_common_collect_box_list',
        { pageNo, pageSize: PAGE_SIZE }
      );

      const batch = (data?.detailList || []) as Array<Record<string, unknown>>;
      allItems = allItems.concat(batch);

      if (batch.length < PAGE_SIZE) break; // last page or empty
      pageNo++;
    }

    const items = allItems.map((item) => ({
      id: item.commonCollectBoxDetailId,
      title: item.title,
      thumbnail: item.listThumbnail || item.thumbnail,
      price: item.price,
      stock: item.stock,
      status: item.status,
      gmtCreate: item.gmtCreate,
      source: (item.sourceList as Array<Record<string, unknown>> | undefined)?.[0]?.source,
      sourceUrl: (item.sourceList as Array<Record<string, unknown>> | undefined)?.[0]?.sourceItemUrl,
    }));

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error('Miaoshou list error:', error);
    return NextResponse.json(
      { error: '获取采集箱失败: ' + String(error) },
      { status: 500 }
    );
  }
}

// POST: fetch detail / edit item
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json();
    const { action, detailId } = body;

    if (action === 'detail') {
      if (!detailId) {
        return NextResponse.json({ error: 'detailId is required' }, { status: 400 });
      }

      // Fetch detail from miaoshou
      const data = await callMiaoshou(
        '/open/v1/product/common_collect_box/common_collect_box/get_common_collect_box_detail',
        { commonCollectBoxDetailId: detailId }
      );

      const detail = data?.editCommonCollectBoxDetail;

      if (!detail) {
        return NextResponse.json({ error: '未找到商品详情' }, { status: 404 });
      }

      // Download images to R2 in parallel
      const imgUrls: string[] = detail.imgUrls || [];
      const r2Results = await Promise.allSettled(
        imgUrls.map((url: string, i: number) => downloadImageToR2(url, i))
      );
      const r2Images = r2Results
        .filter(
          (r): r is { status: 'fulfilled'; value: string } =>
            r.status === 'fulfilled' && r.value !== null
        )
        .map((r) => r.value);

      // Extract description images from notes HTML (商品描述图)
      // The notes field contains rich HTML with <img> tags for description images
      const notesHtml: string = detail.notes || '';
      const descImgUrls: string[] = [];
      if (notesHtml) {
        const imgRegex = /src="(https?:[^"]+alicdn[^"]+)"/gi;
        let match;
        const gallerySet = new Set(imgUrls);
        while ((match = imgRegex.exec(notesHtml)) !== null) {
          let src = match[1];
          // Only strip query params, keep -0-cib (needed for 1688 CDN access)
          src = src.split('?')[0];
          // Dedup: skip if already in gallery images or already collected
          if (!gallerySet.has(src) && !descImgUrls.includes(src)) {
            descImgUrls.push(src);
          }
        }
      }

      // Download description images to R2
      const descR2Results = await Promise.allSettled(
        descImgUrls.map((url: string, i: number) => downloadImageToR2(url, 100 + i))
      );
      const descR2Images = descR2Results
        .filter(
          (r): r is { status: 'fulfilled'; value: string } =>
            r.status === 'fulfilled' && r.value !== null
        )
        .map((r) => r.value);

      // Clean title and detect category (miaoshou cateList takes priority, fallback to title keywords)
      const cleanedTitle = cleanTitle(detail.title);
      const category = detectCategoryFromMiaoshou(detail.cateList) || detectCategoryFromTitle(cleanedTitle);

      // Extract useful description from notesText (structured attributes)
      const notesText = (detail.notesText as string) || '';
      const notesHtmlContent = (detail.notes as string) || '';

      return NextResponse.json({
        title: cleanedTitle,
        originalTitle: detail.title,
        images: r2Images,
        image_sources: imgUrls,
        description_images: descR2Images,
        desc_image_sources: descImgUrls,
        original_notes_html: notesHtmlContent,
        category,
        description: notesText,
        source: 'miaoshou',
        miaoshouCategory: (detail.cateList || [])[0] || null,
      });
    }

    if (action === 'edit') {
      if (!detailId) {
        return NextResponse.json({ error: 'detailId is required' }, { status: 400 });
      }

      const { title, description } = body;

      // Fetch current detail to get ossMd5 and required fields
      const data = await callMiaoshou(
        '/open/v1/product/common_collect_box/common_collect_box/get_common_collect_box_detail',
        { commonCollectBoxDetailId: detailId }
      );

      const detail = data?.editCommonCollectBoxDetail;
      const ossMd5 = data?.ossMd5;
      if (!detail || !ossMd5) {
        return NextResponse.json({ error: '无法获取商品详情或ossMd5' }, { status: 404 });
      }

      // IMPORTANT: Must include imgUrls to prevent Miaoshou from clearing images
      // Also include notes HTML to prevent it from being cleared
      const editPayload: Record<string, unknown> = {
        commonCollectBoxDetailId: detailId,
        title: title || detail.title,
        price: detail.price,
        imgUrls: detail.imgUrls || [],
        notes: detail.notes || '',
      };

      if (description !== undefined) {
        editPayload.notesText = description;
      }

      const editResult = await callMiaoshou(
        '/open/v1/product/common_collect_box/common_collect_box/edit_common_collect_box_detail',
        {
          commonCollectBoxDetailId: detailId,
          editCommonCollectBoxDetail: editPayload,
          ossMd5,
        }
      );

      console.log(`[MIAOSHOU] Edit success, detailId=${detailId}, imgCount=${(detail.imgUrls || []).length}`);

      return NextResponse.json({ success: true, ossMd5: editResult });
    }

    if (action === 'edit_images') {
      if (!detailId) {
        return NextResponse.json({ error: 'detailId is required' }, { status: 400 });
      }

      const { image_sources, desc_image_sources, description_html, original_notes_html, title, description } = body;

      if (!image_sources || !Array.isArray(image_sources)) {
        return NextResponse.json({ error: 'image_sources is required' }, { status: 400 });
      }

      // Fetch current detail to get required fields and ossMd5
      const data = await callMiaoshou(
        '/open/v1/product/common_collect_box/common_collect_box/get_common_collect_box_detail',
        { commonCollectBoxDetailId: detailId }
      );

      const detail = data?.editCommonCollectBoxDetail;
      const ossMd5 = data?.ossMd5;
      if (!detail || !ossMd5) {
        return NextResponse.json({ error: '无法获取商品详情或ossMd5' }, { status: 404 });
      }

      console.log(`[MIAOSHOU SYNC] detailId=${detailId}, ossMd5=${ossMd5}`);
      console.log(`[MIAOSHOU SYNC] current: title="${detail.title}", imgUrls=${(detail.imgUrls || []).length}, notesLen=${(detail.notes || '').length}, notesTextLen=${(detail.notesText || '').length}`);

      // Build edit payload with ALL fields to prevent Miaoshou from clearing any
      // IMPORTANT: Omitting any field (imgUrls, notes, notesText) will cause Miaoshou to clear it!
      const editPayload: Record<string, unknown> = {
        commonCollectBoxDetailId: detailId,
        title: title || detail.title,
        price: detail.price,
        imgUrls: image_sources,
        notesText: description || detail.notesText || '',
      };

      // Build notes HTML:
      // Priority 1: description_html (built from user's description_long + bullets + desc images)
      // Priority 2: original_notes_html with deleted images filtered out
      if (description_html && typeof description_html === 'string') {
        editPayload.notes = description_html;
      } else if (original_notes_html && desc_image_sources && Array.isArray(desc_image_sources)) {
        const allowedSet = new Set(desc_image_sources.map((u: string) => u.split('?')[0]));
        editPayload.notes = original_notes_html.replace(
          /<img[^>]+src="(https?:\/\/[^\s"]+)"[^>]*\/?>/gi,
          (match: string, src: string) => {
            const cleanSrc = src.split('?')[0];
            if (allowedSet.has(cleanSrc)) {
              return match;
            }
            return ''; // remove entire <img ... /> tag
          }
        );
      } else {
        editPayload.notes = detail.notes || '';
      }

      console.log('[MIAOSHOU SYNC] sending payload keys:', Object.keys(editPayload).join(', '));
      const notesSource = description_html ? 'description_html' : 'original_notes_html';
      console.log('[MIAOSHOU SYNC] notesLen:', String(editPayload.notes || '').length, 'from:', notesSource);
      const syncLogTitle = String(editPayload.title || '');
      const syncLogImgCount = (editPayload.imgUrls as string[] || []).length;
      const syncLogNotesTextLen = String(editPayload.notesText || '').length;
      const syncLogNotesLen = String(editPayload.notes || '').length;
      console.log(`[MIAOSHOU SYNC] sending: title="${syncLogTitle}", imgUrls=${syncLogImgCount}, notesTextLen=${syncLogNotesTextLen}, notesLen=${syncLogNotesLen}`);

      const editResult = await callMiaoshou(
        '/open/v1/product/common_collect_box/common_collect_box/edit_common_collect_box_detail',
        {
          commonCollectBoxDetailId: detailId,
          editCommonCollectBoxDetail: editPayload,
          ossMd5,
        }
      );

      console.log('[MIAOSHOU SYNC] API result:', JSON.stringify(editResult));

      // Verify by re-fetching
      const verify = await callMiaoshou(
        '/open/v1/product/common_collect_box/common_collect_box/get_common_collect_box_detail',
        { commonCollectBoxDetailId: detailId }
      );
      const vd = verify?.editCommonCollectBoxDetail;
      const vdImgUrls = vd?.imgUrls || [];
      console.log('[MIAOSHOU SYNC] verify imgUrls:', JSON.stringify(vdImgUrls));
      console.log(`[MIAOSHOU SYNC] verify after edit: title="${vd?.title}", imgUrls=${vdImgUrls.length}, notesTextLen=${(vd?.notesText || '').length}, notesLen=${(vd?.notes || '').length}`);

      return NextResponse.json({ success: true, ossMd5: editResult, imageCount: image_sources.length, descImageCount: desc_image_sources?.length || 0 });
    }

    if (action === 'tiktok_lookup') {
      // Look up TikTok collect box item by commonCollectBoxDetailId
      if (!detailId) {
        return NextResponse.json({ error: 'detailId is required' }, { status: 400 });
      }

      // Search TikTok collect box (paginate to find match)
      const targetCommonId = String(detailId);
      let pageNo = 1;
      let found: Record<string, unknown> | null = null;

      while (true) {
        const data = await callMiaoshou(
          '/open/v1/product/collect_box/tiktok/collect_box/search_collect_box_detail_list',
          { pageNo, pageSize: 100, site: 'MY' }
        );

        const items = (data?.detailList || []) as Array<Record<string, unknown>>;
        for (const item of items) {
          if (String(item.commonCollectBoxDetailId) === targetCommonId) {
            found = item;
            break;
          }
        }
        if (found || items.length < 100) break;
        pageNo++;
      }

      if (!found) {
        return NextResponse.json({ error: '未在TikTok采集箱中找到该商品' }, { status: 404 });
      }

      const shopList = (found.collectBoxDetailShopList as Array<Record<string, unknown>>) || [];
      return NextResponse.json({
        detailId: found.collectBoxDetailId,
        shopId: shopList[0]?.shopId,
        editModel: found.editModel,
        title: found.title,
        thumbnail: found.thumbnail,
        price: found.price,
        commonCollectBoxDetailId: found.commonCollectBoxDetailId,
      });
    }

    if (action === 'edit_tiktok') {
      if (!detailId) {
        return NextResponse.json({ error: 'detailId is required' }, { status: 400 });
      }

      const { shopId, title, description, image_sources, description_html, original_notes_html, desc_image_sources, productId } = body;
      if (!shopId) {
        return NextResponse.json({ error: 'shopId is required' }, { status: 400 });
      }

      // Fetch current TikTok collect box detail
      const detailData = await callMiaoshou(
        '/open/v1/product/collect_box/tiktok/collect_box/get_shop_collect_item_info',
        { detailId: Number(detailId), shopId: Number(shopId) }
      );

      const info = detailData?.shopCollectItemInfo;
      const ossMd5 = detailData?.ossMd5;
      if (!info || !ossMd5) {
        return NextResponse.json({ error: '无法获取TikTok采集箱详情' }, { status: 404 });
      }

      console.log(`[MIAOSHOU TIKTOK] detailId=${detailId}, shopId=${shopId}, ossMd5=${ossMd5}`);
      console.log(`[MIAOSHOU TIKTOK] current: title="${info.title}", imgUrls=${(info.imgUrls || []).length}, notesLen=${(info.notes || '').length}`);

      // Use provided images (R2 URLs) or fall back to originals
      // TikTok limits imgUrls to max 15
      const allImages = (image_sources && image_sources.length > 0)
        ? image_sources
        : (info.imgUrls || []);
      const galleryImages = allImages.slice(0, 15);

      // Build notes HTML: priority 1) description_html, 2) original_notes_html with R2 image replacement, 3) original notes
      let notesHtml: string;
      if (description_html && typeof description_html === 'string') {
        notesHtml = description_html;
      } else if (original_notes_html && desc_image_sources && desc_image_sources.length > 0) {
        // Replace alicdn image URLs in notes with corresponding R2 desc_image_sources
        const alicdnUrls: string[] = [];
        const alicdnRegex = /src="(https?:\/\/cbu01\.alicdn\.com\/[^"]+)"/gi;
        let m;
        while ((m = alicdnRegex.exec(original_notes_html)) !== null) {
          alicdnUrls.push(m[1].split('?')[0]);
        }
        notesHtml = original_notes_html;
        if (image_sources && image_sources.length > 0) {
          // This is a mapping replacement: replace each alicdn URL with its R2 counterpart
          alicdnUrls.forEach((aUrl, idx) => {
            if (idx < image_sources.length) {
              notesHtml = notesHtml.replace(aUrl, image_sources[idx]);
            }
          });
        }
      } else {
        notesHtml = info.notes || '';
      }

      // Build save payload — include ALL original fields, only modify what we need
      const saveInfo: Record<string, unknown> = { ...info };
      saveInfo.imgUrls = galleryImages;
      saveInfo.notes = notesHtml;
      saveInfo.deliveryOptionSetType = '0';
      if (title) saveInfo.title = title;

      // Ensure required package dimensions are present (TikTok requires them)
      if (!saveInfo.packageLength) saveInfo.packageLength = 20;
      if (!saveInfo.packageWidth) saveInfo.packageWidth = 15;
      if (!saveInfo.packageHeight) saveInfo.packageHeight = 5;
      if (!saveInfo.packageWeight) saveInfo.packageWeight = 0.2;

      // CRITICAL: Remove sizeChartType to avoid "尺寸表" validation errors
      delete saveInfo.sizeChartType;
      // Also remove sizeChart if empty (causes validation issues)
      if (!saveInfo.sizeChart || saveInfo.sizeChart === '') {
        delete saveInfo.sizeChart;
      }

      const saveResult = await callMiaoshou(
        '/open/v1/product/collect_box/tiktok/collect_box/save_shop_collect_item_info',
        {
          detailId: Number(detailId),
          shopId: Number(shopId),
          shopCollectItemInfo: saveInfo,
          ossMd5,
        }
      );

      console.log(`[MIAOSHOU TIKTOK] save success, ossMd5=${saveResult}`);

      const r2Count = galleryImages.filter((u: string) => u.includes('r2.dev')).length;
      console.log(`[MIAOSHOU TIKTOK] synced ${galleryImages.length} images (${r2Count} from R2)`);

      // Mark product as completed after successful sync
      if (productId) {
        updateProduct(String(productId), { status: 'completed' });
        console.log(`[MIAOSHOU TIKTOK] product ${productId} marked as completed`);
      }

      return NextResponse.json({
        success: true,
        ossMd5: saveResult,
        imageCount: galleryImages.length,
        r2ImageCount: r2Count,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Miaoshou API error:', error);
    return NextResponse.json(
      { error: '操作失败: ' + String(error) },
      { status: 500 }
    );
  }
}
