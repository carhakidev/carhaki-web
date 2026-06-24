import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credits = await prisma.$queryRawUnsafe(
      `SELECT id, total_credits, used_credits, (total_credits - used_credits) as remaining
       FROM report_credits
       WHERE user_id = $1 AND (total_credits - used_credits) > 0
       ORDER BY created_at ASC`,
      session.user.id
    ) as Array<{ id: string; total_credits: number; used_credits: number; remaining: number }>;

    const totalRemaining = credits.reduce((sum, c) => sum + Number(c.remaining), 0);

    return NextResponse.json({
      has_credits: totalRemaining > 0,
      total_remaining: totalRemaining,
      credits,
    });
  } catch {
    return NextResponse.json({ has_credits: false, total_remaining: 0, credits: [] });
  }
}
