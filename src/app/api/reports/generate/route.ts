import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clearvinReport } from '@/lib/clearvin';
import { sendReportReadyEmail } from '@/lib/email';

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
    const { html, reportId: clearvinReportId } = await clearvinReport(vin);
    if (!html) throw new Error('ClearVin returned empty report');

    let recallsList: unknown[] = [];
    try {
      const recallsRes = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`);
      if (recallsRes.ok) {
        const recallData = await recallsRes.json();
        recallsList = recallData.results || [];
      }
    } catch { /* optional */ }

    let score = 100;
    score -= recallsList.length * 5;
    score = Math.max(0, score);
    let grade = 'A', label = 'Excellent', colour = '#16a34a';
    if (score < 90) { grade = 'B'; label = 'Good'; colour = '#2563eb'; }
    if (score < 75) { grade = 'C'; label = 'Fair'; colour = '#d97706'; }
    if (score < 55) { grade = 'D'; label = 'Poor'; colour = '#ea580c'; }
    if (score < 35) { grade = 'F'; label = 'High Risk'; colour = '#dc2626'; }

    const processedData = {
      data_source: 'CLEARVIN',  // uppercase to match report page check
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
    `, grade, score, label, colour, JSON.stringify(processedData), report_id);

    console.log('ClearVin report saved for:', report_id);

    // Send email with PDF
    try {
      const reports = await prisma.$queryRawUnsafe(
        `SELECT r.vin, r.user_id, u.email, u.first_name, u.last_name
         FROM reports r JOIN users u ON r.user_id = u.id
         WHERE r.id = $1 LIMIT 1`, report_id
      ) as Array<{ vin: string; user_id: string; email: string; first_name: string; last_name: string }>;

      const row = reports[0];
      if (row?.email) {
        // Try to get PDF
        let pdfBuffer: ArrayBuffer | undefined;
        if (clearvinReportId) {
          try {
            const { clearvinReportById } = await import('@/lib/clearvin');
            pdfBuffer = await clearvinReportById(clearvinReportId, 'pdf') as ArrayBuffer;
          } catch { /* PDF optional */ }
        }

        // Get vehicle info
        let make: string | undefined, model: string | undefined, year: number | undefined;
        try {
          const nhtsaRes = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
          const nhtsaData = await nhtsaRes.json();
          const r = nhtsaData.Results?.[0];
          make = r?.Make || undefined;
          model = r?.Model || undefined;
          year = r?.ModelYear ? parseInt(r.ModelYear) : undefined;
        } catch { /* optional */ }

        await sendReportReadyEmail({
          to: row.email,
          name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
          vin,
          make, model, year,
          reportUrl: `https://carhaki.com/reports/${report_id}`,
          pdfBuffer,
        });
        console.log('Report email sent to:', row.email);
      }
    } catch (emailErr) {
      console.error('Email failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ status: 'completed', report_id, grade, score });
  } catch (err) {
    console.error('Report generation error:', err);
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET status = 'FAILED', updated_at = NOW() WHERE id = $1`, report_id
    );
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
