import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getTiktokShops } from '@/lib/db';
import { isTiktokConfigured } from '@/lib/tiktok';

// Admin-facing: which shops are authorized (tokens masked).
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  const shops = getTiktokShops().map(s => ({
    shop_id: s.shop_id,
    shop_name: s.shop_name,
    site: s.site,
    open_id: s.open_id,
    status: s.status,
    access_expires_at: s.access_expires_at,
    scopes: s.scopes,
    tokenPreview: s.access_token ? s.access_token.slice(0, 6) + '...' : '',
  }));

  return NextResponse.json({ configured: isTiktokConfigured(), shops });
}
