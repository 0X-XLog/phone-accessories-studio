import { NextRequest, NextResponse } from 'next/server';
import { exchangeAuthCode } from '@/lib/tiktok';
import { upsertTiktokShop, consumeOAuthState } from '@/lib/db';
import crypto from 'crypto';

// Internal endpoint — called ONLY by the Vercel OAuth relay.
// Security model:
//   - HMAC-SHA256(timestamp + '\n' + body, INTERNAL_SECRET) in headers
//     (same pattern as the Miaoshou module's x-timestamp/x-sign)
//   - one-time state nonce (CSRF + replay protection), 1h TTL, consumed on use
//   - this leg carries only the short-lived auth_code — never a token/secret
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

function verifySignature(timestamp: string, rawBody: string, signature: string): boolean {
  if (!INTERNAL_SECRET || !timestamp || !signature) return false;
  // reject replays older than 5 minutes
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', INTERNAL_SECRET).update(`${timestamp}\n${rawBody}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-timestamp') || '';
  const signature = request.headers.get('x-signature') || '';

  if (!verifySignature(timestamp, rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { auth_code?: string; state?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { auth_code, state } = body;
  if (!auth_code || !state) {
    return NextResponse.json({ error: 'auth_code and state are required' }, { status: 400 });
  }
  if (!consumeOAuthState(state)) {
    return NextResponse.json({ error: 'Invalid or expired state' }, { status: 400 });
  }

  try {
    const token = await exchangeAuthCode(auth_code);
    const shop = upsertTiktokShop(token);
    return NextResponse.json({
      ok: true,
      shop: { shop_id: shop.shop_id, shop_name: shop.shop_name, site: shop.site, open_id: shop.open_id },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
}
