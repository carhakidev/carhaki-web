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

    const [user, reports, orders] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.report.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          vin: true,
          status: true,
          overallGrade: true,
          riskScore: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { userId },
        select: { amountNgn: true, paymentStatus: true },
      }),
    ]);

    const paidOrders = orders.filter((o: { paymentStatus: string; amountNgn: number }) => o.paymentStatus === 'SUCCESS');
    const totalSpent = paidOrders.reduce((sum: number, o: { amountNgn: number }) => sum + o.amountNgn, 0);
    const completedCount = reports.filter((r: { status: string }) => r.status === 'COMPLETED').length;
    const pendingCount = reports.filter((r: { status: string }) => r.status === 'PENDING').length;

    return NextResponse.json({
      stats: {
        total_reports: reports.length,
        completed: completedCount,
        pending: pendingCount,
        total_spent_ngn: Math.round(totalSpent / 100),
      },
      reports: reports.map((r: { id: string; vin: string; status: string; overallGrade: string | null; riskScore: number | null; createdAt: Date }) => ({
        id: r.id,
        vin: r.vin,
        search_identifier: r.vin,
        status: r.status,
        overall_grade: r.overallGrade ?? '',
        risk_score: r.riskScore,
        created_at: r.createdAt.toISOString(),
      })),
      user: {
        name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
        email: user?.email ?? '',
        member_since: user?.createdAt?.toISOString() ?? new Date().toISOString(),
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
