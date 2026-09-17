// TikTok Shop Open API — shop-scoped request wrapper + product/media operations
// ⚠️ VERIFY ON FIRST LIVE CALL (Malaysia Development Shop):
//    - signing formula (timestamp + path + body)
//    - endpoint paths/versions (media/202309, product/202309)
//    - multipart signing (empty-body assumption)
import crypto from 'crypto';
import { TiktokShop } from './db';
import { refreshAccessToken } from './tiktok';

const APP_KEY = process.env.TIKTOK_APP_KEY || '';
const APP_SECRET = process.env.TIKTOK_APP_SECRET || '';
const API_BASE = 'https://open-api.tiktokglobalshop.com';

export function isTiktokApiReady(): boolean {
  return !!(APP_KEY && APP_SECRET);
}

// --- DB token persistence helpers are wired via callbacks to avoid circular imports ---
let _persistTokens: ((shopDbId: string, t: { accessToken: string; accessExpiresAt: string; refreshToken: string; refreshExpiresAt: string; scopes: string[] }) => void) | null = null;
export function setTokenPersister(fn: typeof _persistTokens) { _persistTokens = fn; }

export async function getValidAccessToken(shop: TiktokShop): Promise<string> {
  const accessExpires = Date.parse(shop.access_expires_at || '') || 0;
  if (shop.access_token && accessExpires - Date.now() > 5 * 60 * 1000) {
    return shop.access_token;
  }
  const refreshExpires = Date.parse(shop.refresh_expires_at || '') || 0;
  if (!shop.refresh_token || refreshExpires < Date.now()) {
    throw new Error('店铺授权已过期，请重新授权（TikTok 页面重新走一次授权即可）');
  }
  const t = await refreshAccessToken(shop.refresh_token);
  if (_persistTokens) {
    _persistTokens(shop.id, {
      accessToken: t.accessToken, accessExpiresAt: t.accessExpiresAt,
      refreshToken: t.refreshToken, refreshExpiresAt: t.refreshExpiresAt, scopes: t.scopes,
    });
  }
  return t.accessToken;
}

// Sign = HMAC-SHA256(app_secret, timestamp + path + body)  [POST]; empty body for GET/multipart
function signRequest(timestamp: string, path: string, body: string): string {
  return crypto.createHmac('sha256', APP_SECRET).update(timestamp + path + body).digest('hex');
}

export async function tiktokRequest<T = Record<string, unknown>>(
  shop: TiktokShop, method: 'GET' | 'POST', path: string, body?: unknown
): Promise<T> {
  const accessToken = await getValidAccessToken(shop);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = method === 'POST' && body !== undefined ? JSON.stringify(body) : '';
  const sign = signRequest(timestamp, path, bodyStr);
  const qs = new URLSearchParams({ app_key: APP_KEY, timestamp, sign });

  const res = await fetch(`${API_BASE}${path}?${qs.toString()}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-tts-access-token': accessToken },
    body: bodyStr || undefined,
    signal: AbortSignal.timeout(60000),
  });
  const data = await res.json().catch(() => ({}));
  // TikTok business errors: { code: nonzero, message }
  if (data.code !== 0) {
    throw new Error(`TikTok API ${path} 失败 (code=${data.code}): ${data.message || JSON.stringify(data).slice(0, 200)}`);
  }
  return (data.data ?? {}) as T;
}

// --- Media upload: download image URL → multipart upload → return TikTok media uri ---
export async function uploadImageFromUrl(shop: TiktokShop, imageUrl: string): Promise<string> {
  const accessToken = await getValidAccessToken(shop);
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60000) });
  if (!imgRes.ok) throw new Error(`源图下载失败 (${imgRes.status}): ${imageUrl.slice(0, 80)}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const path = '/media/202309/files/upload';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // multipart: sign over timestamp+path only (empty body) — TODO verify on live call
  const sign = signRequest(timestamp, path, '');
  const qs = new URLSearchParams({ app_key: APP_KEY, timestamp, sign });

  const form = new FormData();
  form.append('scene', 'PRODUCT_IMAGE'); // TODO verify scene name on live call
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'product.png');

  const res = await fetch(`${API_BASE}${path}?${qs.toString()}`, {
    method: 'POST',
    headers: { 'x-tts-access-token': accessToken },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  const data = await res.json().catch(() => ({}));
  if (data.code !== 0) throw new Error(`媒体上传失败 (code=${data.code}): ${data.message || ''}`);
  const uri = data?.data?.uri;
  if (!uri) throw new Error(`媒体上传未返回 uri: ${JSON.stringify(data).slice(0, 200)}`);
  return uri;
}

// --- Category tree ---
export interface TiktokCategory { id: string; local_name: string; parent_id: string; is_leaf: boolean; }

export async function getCategoryTree(shop: TiktokShop): Promise<TiktokCategory[]> {
  const data = await tiktokRequest<{ categories?: TiktokCategory[] }>(shop, 'GET', '/product/202309/categories');
  return data.categories || [];
}

// --- Product create + publish ---
export interface CreateProductResult { product_id: string; }

export interface PushProductParams {
  categoryId: string;
  name: string;
  descriptionHtml: string;
  imageUris: string[];
  price: string;       // e.g. "19.90"
  currency: string;    // e.g. "MYR"
  stock: number;
  brandId?: string;    // omit → platform default (No Brand) — TODO verify required fields on live call
  packageWeightG?: number;
}

export async function createProductDraft(shop: TiktokShop, p: PushProductParams): Promise<CreateProductResult> {
  const payload = {
    category_id: p.categoryId,
    name: p.name,
    description: p.descriptionHtml,
    main_images: p.imageUris.map(uri => ({ uri })),
    brand: p.brandId ? { id: p.brandId } : undefined,
    package_weight: { value: p.packageWeightG ?? 200, unit: 'GRAM' },
    package_dimensions: { length: 20, width: 15, height: 5, unit: 'CENTIMETER' },
    skus: [{
      sales_attributes: [],
      price: { amount: p.price, currency: p.currency },
      stock: { quantity: p.stock },
    }],
  };
  return tiktokRequest<CreateProductResult>(shop, 'POST', '/product/202309/products', payload);
}

export async function publishProduct(shop: TiktokShop, productId: string): Promise<void> {
  await tiktokRequest(shop, 'POST', `/product/202309/products/${productId}/publish`);
}
