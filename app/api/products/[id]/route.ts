import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verify-admin';
import { getProductById, updateProduct, deleteProduct, getImagesByProductId, getHistoryByProductId } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  const { id } = await params;
  const product = getProductById(id);

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const images = getImagesByProductId(id);
  const history = getHistoryByProductId(id);

  return NextResponse.json({ product, images, history });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  const { id } = await params;
  const body = await request.json();

  const product = updateProduct(id, body);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (auth !== true) return auth;

  const { id } = await params;
  deleteProduct(id);

  return NextResponse.json({ success: true });
}
