import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS guest_name TEXT,
      ADD COLUMN IF NOT EXISTS guest_email TEXT,
      ADD COLUMN IF NOT EXISTS guest_phone TEXT
    `);
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL`);
    } catch { /* already nullable */ }
    return NextResponse.json({ ok: true, message: 'Migration complete' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
