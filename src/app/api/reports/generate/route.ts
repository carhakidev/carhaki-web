import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clearvinReport } from '@/lib/clearvin';

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key');
  if (internalKey !== (process.env.INTERNAL_API_KEY || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { report_id, vin } = await req.json();
  if (!report_id || !vin) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  await prisma.$executeRawUnsafe(
    `UPDATE reports SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1`, report_id
  );

  try {
    // Fetch ClearVin full report
    const { html, reportId: clearvinReportId } = await clearvinReport(vin);

    if (!html) throw new Error('ClearVin returned empty report');

    // Also fetch NHTSA for recalls count (free, no credit used)
    let recallsList: unknown[] = [];
    try {
      const recallsRes = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`);
      if (recallsRes.ok) {
        const recallData = await recallsRes.json();
        recallsList = recallData.results || [];
      }
    } catch { /* NHTSA optional */ }

    // Grade based on recalls (ClearVin handles full grading in report)
    let score = 100;
    score -= recallsList.length * 5;
    score = Math.max(0, score);
    let grade = 'A', label = 'Excellent', colour = '#16a34a';
    if (score < 90) { grade = 'B'; label = 'Good'; colour = '#2563eb'; }
    if (score < 75) { grade = 'C'; label = 'Fair'; colour = '#d97706'; }
    if (score < 55) { grade = 'D'; label = 'Poor'; colour = '#ea580c'; }
    if (score < 35) { grade = 'F'; label = 'High Risk'; colour = '#dc2626'; }

    const processedData = {
      data_source: 'clearvin',
      clearvin_report_id: clearvinReportId,
      clearvin_html: html,
      recall_count: recallsList.length,
    };

    await prisma.$executeRawUnsafe(`
      UPDATE reports SET
        status = 'COMPLETED',
        overall_grade = $1,
        risk_score = $2,
        grade_label = $3,
        grade_colour = $4,
        processed_data = $5::jsonb,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $6
    `,
      grade, score, label, colour,
      JSON.stringify(processedData),
      report_id
    );

    return NextResponse.json({ status: 'completed', report_id, grade, score });
  } catch (err) {
    console.error('Report generation error:', err);
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET status = 'FAILED', updated_at = NOW() WHERE id = $1`, report_id
    );
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
