import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  return NextResponse.json({
    id: report.id,
    vin: report.vin,
    search_identifier: report.vin,
    status: report.status,
    overall_grade: report.overallGrade ?? '',
    risk_score: report.riskScore ?? 0,
    grade_label: report.gradeLabel ?? '',
    grade_colour: report.gradeColour ?? '',
    processed_data: report.processedData,
    ai_summary: report.aiSummary,
    share_token: report.shareToken,
    is_public: report.isPublic,
    completed_at: report.completedAt?.toISOString() ?? null,
    created_at: report.createdAt.toISOString(),
  });
}
