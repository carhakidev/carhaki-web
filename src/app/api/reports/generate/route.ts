import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clearvinReport } from '@/lib/clearvin';
import { sendReportReadyEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key');
  if (internalKey !== (process.env.INTERNAL_API_KEY || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { report_id, vin, guest_name, guest_email } = await req.json();
  if (!report_id || !vin) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  await prisma.$executeRawUnsafe(
    `UPDATE reports SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1`, report_id
  );

  try {
    const { html, reportId: clearvinReportId } = await clearvinReport(vin);
    if (!html || html.length < 100) throw new Error('ClearVin returned empty report');

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
      data_source: 'CLEARVIN',
      clearvin_report_id: clearvinReportId,
      clearvin_html: html,
      recall_count: recallsList.length,
    };

    await prisma.$executeRawUnsafe(`
      UPDATE reports SET
        status = 'COMPLETED', overall_grade = $1, risk_score = $2,
        grade_label = $3, grade_colour = $4, processed_data = $5::jsonb,
        completed_at = NOW(), updated_at = NOW()
      WHERE id = $6
    `, grade, score, label, colour, JSON.stringify(processedData), report_id);

    console.log('ClearVin report saved for:', report_id);

    // Send email to guest
    if (guest_email) {
      try {
        let pdfBuffer: ArrayBuffer | undefined;
        if (clearvinReportId) {
          try {
            const { clearvinReportById } = await import('@/lib/clearvin');
            pdfBuffer = await clearvinReportById(clearvinReportId, 'pdf') as ArrayBuffer;
          } catch { /* PDF optional */ }
        }

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
          to: guest_email,
          name: guest_name || guest_email,
          vin,
          make, model, year,
          reportUrl: `https://carhaki.com/reports/${report_id}`,
          pdfBuffer,
        });
        console.log('Report email sent to:', guest_email);
      } catch (emailErr) {
        console.error('Email failed (non-fatal):', emailErr);
      }
    }

    return NextResponse.json({ status: 'completed', report_id, grade, score });
  } catch (err) {
    console.error('Report generation error:', err);
    // NHTSA fallback
    try {
      const [nhtsaRes, recallsRes] = await Promise.allSettled([
        fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`),
        fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`),
      ]);
      let vehicleData: Record<string, unknown> = {};
      let recallsList: unknown[] = [];
      if (nhtsaRes.status === 'fulfilled' && nhtsaRes.value.ok) {
        const raw = await nhtsaRes.value.json();
        const r = raw.Results?.[0] ?? {};
        vehicleData = { vin, make: r.Make||null, model: r.Model||null, year: r.ModelYear?parseInt(r.ModelYear):null };
      }
      if (recallsRes.status === 'fulfilled' && recallsRes.value.ok) {
        const rd = await recallsRes.value.json();
        recallsList = (rd.results||[]).map((r: Record<string,unknown>) => ({
          recall_number: r.NHTSACampaignNumber||'', component: r.Component||'', summary: r.Summary||''
        }));
      }
      const score = Math.max(0, 100 - recallsList.length * 5);
      const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
      const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':score>=35?'Poor':'High Risk';
      const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':score>=35?'#ea580c':'#dc2626';
      const pd = JSON.stringify({ vehicle: vehicleData, recalls: recallsList, data_source:'NHTSA_FALLBACK' });
      await prisma.$executeRawUnsafe(
        `UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2, grade_label=$3, 
         grade_colour=$4, processed_data=$5::jsonb, completed_at=NOW(), updated_at=NOW() WHERE id=$6`,
        grade, score, label, colour, pd, report_id
      );

      // Still send email on fallback
      if (guest_email) {
        try {
          await sendReportReadyEmail({
            to: guest_email,
            name: guest_name || guest_email,
            vin,
            make: vehicleData.make as string,
            model: vehicleData.model as string,
            year: vehicleData.year as number,
            reportUrl: `https://carhaki.com/reports/${report_id}`,
          });
        } catch { /* non-fatal */ }
      }
    } catch {
      await prisma.$executeRawUnsafe(
        `UPDATE reports SET status='FAILED', updated_at=NOW() WHERE id=$1`, report_id
      );
    }
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
