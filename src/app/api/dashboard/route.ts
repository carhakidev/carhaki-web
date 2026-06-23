import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const [user, reports, stats] = await Promise.all([
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
    prisma.order.aggregate({
      where: { userId, paymentStatus: 'SUCCESS' },
      _sum: { amountNgn: true },
      _count: true,
    }),
  ]);

  const completedCount = reports.filter((r: { status: string }) => r.status === 'COMPLETED').length;
  const pendingCount = reports.filter((r: { status: string }) => r.status === 'PENDING').length;

  return NextResponse.json({
    stats: {
      total_reports: reports.length,
      completed: completedCount,
      pending: pendingCount,
      total_spent_ngn: Math.round((stats._sum.amountNgn ?? 0) / 100),
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
      name: `${user?.firstName} ${user?.lastName}`,
      email: user?.email,
      member_since: user?.createdAt.toISOString(),
    },
  });
}
