import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vin } = await req.json();
    const upperVin = vin?.toUpperCase();
    if (!upperVin || upperVin.length !== 17) {
      return NextResponse.json({ error: 'Invalid VIN' }, { status: 400 });
    }

    // Find available credit
    const credits = await prisma.$queryRawUnsafe(
      `SELECT id, total_credits, used_credits, order_id FROM report_credits
       WHERE user_id = $1 AND (total_credits - used_credits) > 0
       ORDER BY created_at ASC LIMIT 1`,
      session.user.id
    ) as Array<{ id: string; total_credits: number; used_credits: number; order_id: string }>;

    if (!credits[0]) {
      return NextResponse.json({ error: 'No credits available' }, { status: 402 });
    }

    const credit = credits[0];

    // Burn the credit
    await prisma.$executeRawUnsafe(
      `UPDATE report_credits SET used_credits = used_credits + 1, updated_at = NOW() WHERE id = $1`,
      credit.id
    );

    // Create report record
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PENDING', $5, false, NOW(), NOW())`,
      reportId, credit.order_id, session.user.id, upperVin, shareToken
    );

    const remaining = Number(credit.total_credits) - Number(credit.used_credits) - 1;

    // Return report_id immediately
    const response = NextResponse.json({
      status: 'success',
      report_id: reportId,
      vin: upperVin,
      credits_remaining: remaining,
    });

    // Generate report in background (best effort)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com';
    fetch(`${baseUrl}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({ report_id: reportId, vin: upperVin }),
    }).catch(() => {});

    return response;

  } catch (error) {
    console.error('Use credit error:', error);
    return NextResponse.json(
      { error: 'Failed to use credit', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
