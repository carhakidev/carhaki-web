import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ exists: false });
    }

    const vin = req.nextUrl.searchParams.get('vin')?.toUpperCase();
    if (!vin) return NextResponse.json({ exists: false });

    const reports = await prisma.$queryRawUnsafe(
      `SELECT id, status FROM reports WHERE user_id = $1 AND vin = $2 ORDER BY created_at DESC LIMIT 1`,
      session.user.id, vin
    ) as Array<{ id: string; status: string }>;

    if (reports[0]) {
      return NextResponse.json({ exists: true, report_id: reports[0].id, status: reports[0].status });
    }
    return NextResponse.json({ exists: false });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
