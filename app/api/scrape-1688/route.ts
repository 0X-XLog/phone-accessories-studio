import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { verifyAdmin } from '@/lib/verify-admin';
import { uploadToR2, generateUploadKey } from '@/lib/r2';
import { detectCategoryFromTitle } from '@/lib/categories';

// Clean 1688 title: remove brand stuffing, SEO spam, normalize
function cleanTitle(title: string): string {
  let cleaned = title;
  const brandList = ['oppo','vivo','小米','华为','三星','苹果','iphone','ipad','荣耀','红米','一加','realme','iqoo','魅族','努比亚','联想','中兴','索尼','lg','htc','诺基亚','pixel','galaxy','asus','华硕','惠普','hp','lenovo','dell','微软','surface','摩托罗拉','酷派','金立','锤子','黑莓'];
  const brandsPattern = brandList.join('|');

  // Detect how many distinct brands appear
  const lowerTitle = cleaned.toLowerCase();
  const foundBrands = brandList.filter(b => lowerTitle.includes(b.toLowerCase()));

  if (foundBrands.length >= 2) {
    // 2+ brands = brand stuffing, remove brand clusters and stuffing keywords

    // Remove 通用/适用/适配 block with brand cluster
    cleaned = cleaned.replace(new RegExp(
      `[\\/、,，\\s]*(?:通用|适用|适配|适合|兼容|for)\\s*[\\/、,，\\s]*(?:${brandsPattern})[\\/、,，\\s]*(?:${brandsPattern})[\\/、,，\\s\\u4e00-\\u9fff]*通用?`, 'gi'), '');

    // Remove remaining brand clusters (with or without separators)
    cleaned = cleaned.replace(new RegExp(
      `(?:${brandsPattern})[\\/、,，\\s]*(?:${brandsPattern})(?:[\\/、,，\\s]*(?:${brandsPattern}))*`, 'gi'), '');

    // Remove leftover stuffing keywords
    cleaned = cleaned.replace(/\s*(?:通用|适用于|适配于|适合于|兼容于|for)\s*/gi, ' ');
    cleaned = cleaned.replace(/(^|\s)适用(\s|$)/g, '$1$2');

  } else if (foundBrands.length === 1) {
    // 1 brand - keep as product identity, only remove wrapper stuffing
    cleaned = cleaned.replace(new RegExp(`(?:适用|适配|for)\\s*于?\\s*[\\/、,，]?\\s*(?:${brandsPattern})[^\\u4e00-\\u9fff]{0,10}`, 'gi'), '');
    cleaned = cleaned.replace(/\s*通用\s*/g, ' ');
  }

  // Remove 1688 SEO padding (always)
  cleaned = cleaned.replace(/(?:工厂直销|批发|一件代发|跨境专供|爆款|热销|新款上市|厂家直供|源头工厂|大量现货|源头厂家|支持混批|七天退换)[\/、,，\s]*/gi, '');

  // Clean up separators
  cleaned = cleaned.replace(/[\s\/、,，]{2,}/g, ' ');
  cleaned = cleaned.replace(/^[\s\/、,，]+|[\s\/、,，]+$/g, '');
  return cleaned.trim();
}

// Extract offer ID from various 1688 URL formats
function extractOfferId(url: string): string | null {
  const patterns = [
    /offer\/(\d+)\.html/,
    /offer\/(\d+)/,
    /(\d{10,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Download a 1688 image and upload to R2
async function downloadImageToR2(imgUrl: string, index: number): Promise<string | null> {
  const normalizeUrl = (url: string) => url.startsWith('//') ? 'https:' + url : url;
  const baseUrl = normalizeUrl(imgUrl).split('?')[0];
  const candidates = Array.from(new Set([
    baseUrl,
    baseUrl.replace(/(\.(?:jpg|jpeg|png|webp))$/i, '-0-cib$1'),
  ]));

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: {
          'Referer': 'https://m.1688.com/',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.error(`Failed to download image ${index}: ${res.status} ${candidate}`);
        continue;
      }

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        console.error(`Failed to download image ${index}: non-image ${contentType}`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const key = generateUploadKey(`1688-img-${index}.${ext}`, 'pa-studio/1688');

      const result = await uploadToR2(buffer, key, contentType);
      return result.url;
    } catch (err) {
      console.error(`Failed to download image ${index}:`, err);
    }
  }

  return null;
}

// Launch browser singleton (reused across requests)
let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
let browserLaunching: Promise<Awaited<ReturnType<typeof puppeteer.launch>>> | null = null;

async function getBrowser() {
  if (browserInstance) return browserInstance;
  if (browserLaunching) return browserLaunching;

  browserLaunching = puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  });

  browserInstance = await browserLaunching;
  browserLaunching = null;
  return browserInstance;
}

// Try to scrape a page with given URL and UA config
async function tryScrapePage(page: import('puppeteer-core').Page, targetUrl: string, isMobile: boolean): Promise<{ title: string; images: string[]; descriptionImages: string[] } | null> {
  try {
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    // Wait for dynamic content to render (JS frameworks, lazy images)
    await new Promise((r) => setTimeout(r, 5000));

    const finalUrl = page.url();
    // Skip if redirected to login page
    if (finalUrl.includes('login') || finalUrl.includes('signin')) return null;

    return await page.evaluate(() => {
      // Extract title
      let title = '';
      const titleEl = document.querySelector('title');
      if (titleEl?.textContent) {
        title = titleEl.textContent
          .replace(/\s*[-_|–—]\s*(阿里巴巴|1688\.com|Alibaba|详情|商品|供应|找好货).*/gi, '')
          .trim();
      }
      if (!title) {
        const ogEl = document.querySelector('meta[property="og:title"]');
        if (ogEl) title = (ogEl as HTMLMetaElement).content || '';
      }
      if (!title) {
        const h1 = document.querySelector('h1');
        if (h1) title = h1.textContent?.trim() || '';
      }

      // Extract images - scoped to product gallery, not recommendations
      const images: string[] = [];
      // Collect image URLs from specific product gallery containers
      // Mobile: .offer-detail-swiper, .detail-gallery-swiper, .swipe-wrap, [class*="swiper"]
      // Desktop: #dt-tab, .detail-gallery-img, .vertical-image-viewer, .mod-detail-gallery
      const gallerySelectors = [
        '.offer-detail-swiper',
        '.detail-gallery-swiper',
        '.swipe-wrap',
        '[class*="swiper-slide"]',
        '#dt-tab',
        '.detail-gallery-img',
        '.vertical-image-viewer',
        '.mod-detail-gallery',
        '.detail-preview-img',
        '[class*="image-viewer"]',
        '[class*="img-viewer"]',
      ];

      let foundGallery = false;
      for (const sel of gallerySelectors) {
        const containers = document.querySelectorAll(sel);
        if (containers.length === 0) continue;

        for (const container of containers) {
          const imgs = container.querySelectorAll('img');
          for (const img of imgs) {
            let src = (img as HTMLImageElement).dataset.src
              || (img as HTMLImageElement).dataset.lazyloadSrc
              || img.getAttribute('src')
              || '';
            if (!src || !src.includes('/ibank/')) continue;

            // Remove 1688 size/suffix to get original image
            // .400x400., _400x400., .thumb.400x400. → remove
            // -0-cib (800x800 thumb), -0-32-32 (tiny) → remove for original HD image
            src = src
              .replace(/\.\d+x\d+\./g, '.')
              .replace(/_\d+x\d+\./g, '.')
              .replace(/\.thumb\.\d+x\d+\./g, '.')
              .replace(/-0-cib\./g, '.')
              .split('?')[0];

            if (!images.includes(src) && images.length < 9) {
              images.push(src);
              foundGallery = true;
            }
          }
          if (images.length >= 9) break;
        }
        if (images.length >= 9) break;
      }

      // Fallback: if no gallery containers found, use first N ibank images
      // but skip images inside recommendation/similar product sections
      if (!foundGallery) {
        const excludeSelectors = [
          '[class*="recommend"]',
          '[class*="similar"]',
          '[class*="you-like"]',
          '[class*="also-like"]',
          '[class*="guess-like"]',
          '[class*="promo"]',
          '[class*="banner"]',
          '[id*="recommend"]',
          '[id*="similar"]',
        ];
        const imgElements = document.querySelectorAll('img');
        for (const img of imgElements) {
          // Skip if inside recommendation/similar sections
          const parent = img.closest(excludeSelectors.join(','));
          if (parent) continue;

          let src = (img as HTMLImageElement).dataset.src
            || (img as HTMLImageElement).dataset.lazyloadSrc
            || img.getAttribute('src')
            || '';
          if (!src || !src.includes('/ibank/')) continue;

          src = src
            .replace(/\.\d+x\d+\./g, '.')
            .replace(/_\d+x\d+\./g, '.')
            .replace(/\.thumb\.\d+x\d+\./g, '.')
            .replace(/-0-cib\./g, '.')
            .split('?')[0];

          if (!images.includes(src) && images.length < 9) {
            images.push(src);
          }
        }
      }

      // Extract description/detail section images (商品详情)
      const descImages: string[] = [];
      const descSelectors = [
        '#mod-detail-description',
        '#J_DivItemDesc',
        '.mod-detail-description',
        '.desc-section',
        '[class*="detail-description"]',
        '[class*="detail-desc"]',
        '#desc',
        '.offer-detail-description',
        '.detail-content',
        '.rich-text-content',
        '#J-offer-desc',
        '.offer-attr-section',
      ];

      for (const sel of descSelectors) {
        const descContainer = document.querySelector(sel);
        if (!descContainer) continue;

        // Collect all images within the description container
        const descImgs = descContainer.querySelectorAll('img');
        for (const img of descImgs) {
          let src = (img as HTMLImageElement).dataset.src
            || (img as HTMLImageElement).dataset.lazyloadSrc
            || (img as HTMLImageElement).dataset.original
            || img.getAttribute('src')
            || '';

          // Normalize protocol-relative URLs
          if (src.startsWith('//')) src = 'https:' + src;

          // Only keep alicdn/ibank images, skip tiny icons/logos (< 100x100 implied by size suffix)
          if (!src) continue;
          if (!src.includes('alicdn.com') && !src.includes('/ibank/')) continue;

          // Clean size suffixes to get original
          src = src
            .replace(/\.\d+x\d+\./g, '.')
            .replace(/_\d+x\d+\./g, '.')
            .replace(/\.thumb\.\d+x\d+\./g, '.')
            .replace(/-0-cib\./g, '.')
            .split('?')[0];

          // Skip if already in gallery images (dedup)
          if (images.includes(src)) continue;
          if (descImages.includes(src)) continue;
          if (descImages.length >= 20) break;

          descImages.push(src);
        }
        if (descImages.length > 0) break; // found description section, stop looking
      }

      return { title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), images, descriptionImages: descImages };
    });
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const offerId = extractOfferId(url);
    if (!offerId) {
      return NextResponse.json({ error: '无法识别1688商品链接，请确认链接格式或直接输入商品标题' }, { status: 400 });
    }

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Try mobile first (no login required), then desktop as fallback
      const mobileUrl = `https://m.1688.com/offer/${offerId}.html`;
      const desktopUrl = `https://detail.1688.com/offer/${offerId}.html`;

      // Attempt 1: Mobile page
      await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      );
      await page.setViewport({ width: 414, height: 896 });
      let data = await tryScrapePage(page, mobileUrl, true);

      // Attempt 2: Desktop page
      if (!data || !data.title) {
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1920, height: 1080 });
        data = await tryScrapePage(page, desktopUrl, false);
      }

      if (!data || !data.title) {
        return NextResponse.json(
          { error: '无法提取商品标题，请直接输入商品标题' },
          { status: 400 }
        );
      }

      // Download images to R2 in parallel
      const r2Results = await Promise.allSettled(
        data.images.map((imgUrl, i) => downloadImageToR2(imgUrl, i))
      );

      const r2Urls = r2Results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
        .map((r) => r.value);

      // Download description images to R2 in parallel (separate prefix)
      const descR2Results = await Promise.allSettled(
        (data.descriptionImages || []).map((imgUrl, i) => downloadImageToR2(imgUrl, 100 + i))
      );

      const descR2Urls = descR2Results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
        .map((r) => r.value);

      // Detect category from cleaned title
      const cleanedTitle = cleanTitle(data.title);
      const category = detectCategoryFromTitle(cleanedTitle);

      return NextResponse.json({
        title: cleanedTitle,
        originalTitle: data.title,
        images: r2Urls,
        description_images: descR2Urls,
        category,
        source: 'browser',
      });
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error('1688 scrape error:', error);
    // Reset browser on error to recover
    if (browserInstance) {
      browserInstance.close().catch(() => {});
      browserInstance = null;
    }
    return NextResponse.json(
      { error: '抓取失败: ' + String(error) },
      { status: 500 }
    );
  }
}
