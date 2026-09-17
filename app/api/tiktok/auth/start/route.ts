import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getAuthorizeUrl, isTiktokConfigured } from '@/lib/tiktok';
import { createOAuthState } from '@/lib/db';
import crypto from 'crypto';

// Admin clicks "授权 TikTok 店铺" → returns the TikTok authorize page URL.
// The state nonce is stored server-side; the Vercel relay must echo it back.
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  if (!isTiktokConfigured()) {
    return NextResponse.json({ error: '未配置 TIKTOK_APP_KEY / TIKTOK_APP_SECRET / TIKTOK_REDIRECT_URI' }, { status: 400 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  createOAuthState(state);
  return NextResponse.json({ authorizeUrl: getAuthorizeUrl(state), state });
}
