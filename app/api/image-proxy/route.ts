import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';

// Proxy external images (alicdn, etc.) to bypass Referer-based hotlink protection
const ALLOWED_HOSTS = [
  'alicdn.com',
  'cbu01.alicdn.com',
  'cbu02.alicdn.com',
  'img.alicdn.com',
];

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const allowed = ALLOWED_HOSTS.some(h => parsed.hostname.endsWith(h));
  if (!allowed) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        Referer: 'https://detail.1688.com/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return new NextResponse('Failed to fetch image', { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
  }
}
