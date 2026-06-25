import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ ok: false });

    await prisma.$executeRawUnsafe(
      `UPDATE referral_codes SET clicks = clicks + 1, updated_at = NOW() 
       WHERE code = $1 AND is_active = true`,
      code.toUpperCase()
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
