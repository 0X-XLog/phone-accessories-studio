// TikTok Shop Open API client (self-authorized custom app)
// Design: ECS-only secrets — the Vercel relay never sees app_key/secret/token.
// NOTE: verify endpoint paths & params against current TikTok Shop docs
// (https://partner.tiktokshop.com/doc) during first live test with real keys.
const APP_KEY = process.env.TIKTOK_APP_KEY || '';
const APP_SECRET = process.env.TIKTOK_APP_SECRET || '';
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || '';
const AUTH_BASE = 'https://auth.tiktokglobalshop.com';
const API_BASE = 'https://open-api.tiktokglobalshop.com';

export function isTiktokConfigured(): boolean {
  return !!(APP_KEY && APP_SECRET && TIKTOK_REDIRECT_URI);
}

export function getAuthorizeUrl(state: string): string {
  // Scopes are controlled app-side (Enable API); authorize URL omits scope param
  // so the app's enabled scope set applies. Keep the enabled list minimal.
  const qs = new URLSearchParams({
    app_key: APP_KEY,
    state,
    redirect_uri: TIKTOK_REDIRECT_URI,
  });
  return `${AUTH_BASE}/oauth/authorize?${qs.toString()}`;
}

export interface TiktokTokenSet {
  openId: string;
  accessToken: string;
  accessExpiresAt: string; // ISO
  refreshToken: string;
  refreshExpiresAt: string; // ISO
  scopes: string[];
  shopId?: string;
  shopName?: string;
  sellerName?: string;
}

function isoAfter(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

// Exchange the one-time auth_code for the token set (server-to-server, HTTPS)
export async function exchangeAuthCode(authCode: string): Promise<TiktokTokenSet> {
  if (!APP_KEY || !APP_SECRET) throw new Error('未配置 TIKTOK_APP_KEY / TIKTOK_APP_SECRET');

  const body = new URLSearchParams({
    app_key: APP_KEY,
    app_secret: APP_SECRET,
    auth_code: authCode,
    grant_type: 'authorized_code',
  });
  const res = await fetch(`${AUTH_BASE}/api/v2/token/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  const t = data?.data?.access_token
    ? data.data
    : null;
  if (!t) {
    throw new Error(`token exchange failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return {
    openId: t.open_id || '',
    accessToken: t.access_token,
    accessExpiresAt: isoAfter(t.access_token_expire_in || 4 * 3600),
    refreshToken: t.refresh_token || '',
    refreshExpiresAt: isoAfter(t.refresh_token_expire_in || 180 * 24 * 3600),
    scopes: Array.isArray(t.scope) ? t.scope : [],
    shopId: t.shop_id || '',
    shopName: t.shop_name || '',
    sellerName: t.seller_name || '',
  };
}

// Refresh an expired access_token (called before API calls when needed)
export async function refreshAccessToken(refreshToken: string): Promise<TiktokTokenSet> {
  if (!APP_KEY || !APP_SECRET) throw new Error('未配置 TIKTOK_APP_KEY / TIKTOK_APP_SECRET');
  const body = new URLSearchParams({
    app_key: APP_KEY,
    app_secret: APP_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(`${AUTH_BASE}/api/v2/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  const t = data?.data?.access_token ? data.data : null;
  if (!t) throw new Error(`token refresh failed: ${JSON.stringify(data).slice(0, 300)}`);
  return {
    openId: t.open_id || '',
    accessToken: t.access_token,
    accessExpiresAt: isoAfter(t.access_token_expire_in || 4 * 3600),
    refreshToken: t.refresh_token || '',
    refreshExpiresAt: isoAfter(t.refresh_token_expire_in || 180 * 24 * 3600),
    scopes: Array.isArray(t.scope) ? t.scope : [],
  };
}

// Signed API call helper — TikTok requires sign = HMAC-SHA256(path + params + body, secret)
// TODO(when keys arrive): implement per current docs (path+query+body canonicalization
// differs slightly across API versions); wire product create / media upload here.
export function tiktokApiBase(): string {
  return API_BASE;
}
