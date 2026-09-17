import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getTiktokShops } from '@/lib/db';
import { getCategoryTree } from '@/lib/tiktok-api';
import { matchTiktokCategories } from '@/lib/tiktok-categories';

// List TikTok leaf categories, optionally auto-matched to one of our category ids
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const shops = getTiktokShops().filter(s => s.status === 'active');
    if (shops.length === 0) {
      return NextResponse.json({ error: '还没有已授权的 TikTok 店铺，请先完成授权' }, { status: 400 });
    }
    const shopId = new URL(request.url).searchParams.get('shopId');
    const shop = shops.find(s => s.id === shopId) || shops[0];

    const categoryId = new URL(request.url).searchParams.get('categoryId');
    const tree = await getCategoryTree(shop);

    if (categoryId) {
      return NextResponse.json({ matches: matchTiktokCategories(categoryId, tree) });
    }
    return NextResponse.json({
      total: tree.length,
      leaves: tree.filter(c => c.is_leaf).map(c => ({ id: c.id, name: c.local_name })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
}
