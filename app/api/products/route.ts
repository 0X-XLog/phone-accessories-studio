import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProducts, createProduct } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const { products, total } = getProducts(status, limit, offset);

  return NextResponse.json({ products, total });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json();
    const { name, category, brand, color, material, selling_points, original_images, description_images, original_image_sources, desc_image_sources, source, ms_detail_id } = body;

    const product = createProduct({
      name: name || '',
      category: category || '',
      brand: brand || '',
      color: color || '',
      material: material || '',
      selling_points: selling_points || [],
      original_images: original_images || [],
      description_images: description_images || [],
      original_image_sources: original_image_sources || [],
      desc_image_sources: desc_image_sources || [],
      source: source || '',
      ms_detail_id: ms_detail_id || null,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Product create error:', error);
    return NextResponse.json({ error: 'Failed to create product', message: String(error) }, { status: 500 });
  }
}
