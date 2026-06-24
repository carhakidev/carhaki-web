import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [userRows, reports, orders] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT id, email, first_name, last_name, created_at FROM users WHERE id = $1 LIMIT 1`,
        userId
      ) as Promise<Array<{ id: string; email: string; first_name: string; last_name: string; created_at: Date }>>,
      prisma.$queryRawUnsafe(
        `SELECT id, vin, status, overall_grade, risk_score, created_at 
         FROM reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
        userId
      ) as Promise<Array<{ id: string; vin: string; status: string; overall_grade: string | null; risk_score: number | null; created_at: Date }>>,
      prisma.$queryRawUnsafe(
        `SELECT amount_ngn, payment_status FROM orders WHERE user_id = $1`,
        userId
      ) as Promise<Array<{ amount_ngn: number; payment_status: string }>>,
    ]);

    const user = userRows[0];
    const paidOrders = orders.filter((o) => o.payment_status === 'SUCCESS');
    const totalSpent = paidOrders.reduce((sum, o) => sum + o.amount_ngn, 0);
    const completedCount = reports.filter((r) => r.status === 'COMPLETED').length;
    const pendingCount = reports.filter((r) => r.status === 'PENDING').length;

    return NextResponse.json({
      stats: {
        total_reports: reports.length,
        completed: completedCount,
        pending: pendingCount,
        total_spent_ngn: Math.round(totalSpent / 100),
      },
      reports: reports.map((r) => ({
        id: r.id,
        vin: r.vin,
        search_identifier: r.vin,
        status: r.status,
        overall_grade: r.overall_grade ?? '',
        risk_score: r.risk_score,
        created_at: r.created_at,
      })),
      user: {
        name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
        email: user?.email ?? '',
        member_since: user?.created_at ?? new Date(),
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
