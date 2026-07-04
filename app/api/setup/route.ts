import { NextResponse } from 'next/server';
import { ensureDatabase } from '@/lib/db-migrate';

export async function POST() {
  const result = await ensureDatabase();
  if (result.ok) {
    return NextResponse.json({ success: true, message: 'Database initialized successfully' });
  }
  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}

export async function GET() {
  return POST();
}
