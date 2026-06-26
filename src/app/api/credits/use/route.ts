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

    // Create report record — order_id is NULL for credit-based reports
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
       VALUES ($1, NULL, $2, $3, 'PENDING', $4, false, NOW(), NOW())`,
      reportId, session.user.id, upperVin, shareToken
    );

    const remaining = Number(credit.total_credits) - Number(credit.used_credits) - 1;

    // Generate report inline with parallel NHTSA calls (fast enough for Vercel 10s limit)
    try {
      const [nhtsaRes, recallsRes] = await Promise.all([
        fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${upperVin}?format=json`),
        fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${upperVin}`),
      ]);

      let vehicleData: Record<string, unknown> = {};
      let recallsList: unknown[] = [];

      if (nhtsaRes.ok) {
        const nhtsaRaw = await nhtsaRes.json();
        const r = nhtsaRaw.Results?.[0] ?? {};
        vehicleData = {
          vin: upperVin, make: r.Make || null, model: r.Model || null,
          year: r.ModelYear ? parseInt(r.ModelYear) : null,
          engine: r.DisplacementL ? `${parseFloat(r.DisplacementL).toFixed(1)}L` : null,
          fuel_type: r.FuelTypePrimary || null, drive_type: r.DriveType || null,
          body_type: r.BodyClass || null, country_of_manufacture: r.PlantCountry || null,
          doors: r.Doors ? parseInt(r.Doors) : null,
        };
      }

      if (recallsRes.ok) {
        const recallData = await recallsRes.json();
        recallsList = (recallData.results || []).map((r: Record<string, unknown>) => ({
          recall_number: r.NHTSACampaignNumber || '', component: r.Component || '',
          summary: r.Summary || '', remedy: r.Remedy || null, is_open: true,
        }));
      }

      let score = 100 - (recallsList.length * 5);
      score = Math.max(0, score);
      const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : score >= 35 ? 'D' : 'F';
      const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 55 ? 'Fair' : score >= 35 ? 'Poor' : 'High Risk';
      const colour = score >= 90 ? '#16a34a' : score >= 75 ? '#2563eb' : score >= 55 ? '#d97706' : score >= 35 ? '#ea580c' : '#dc2626';
      const processedData = JSON.stringify({ vehicle: vehicleData, recalls: recallsList, accidents: [], theft: [], odometer_records: [], data_source: 'NHTSA' });

      await prisma.$executeRawUnsafe(
        `UPDATE reports SET status = 'COMPLETED', overall_grade = $1, risk_score = $2,
         grade_label = $3, grade_colour = $4, completed_at = NOW(), updated_at = NOW() WHERE id = $5`,
        grade, score, label, colour, reportId
      );
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE reports SET processed_data = $1::jsonb WHERE id = $2`,
          processedData, reportId
        );
      } catch { /* non-fatal */ }
    } catch {
      // Generation failed — report stays PENDING, user can still view it
    }

    return NextResponse.json({
      status: 'success',
      report_id: reportId,
      vin: upperVin,
      credits_remaining: remaining,
    });

  } catch (error) {
    console.error('Use credit error:', error);
    return NextResponse.json(
      { error: 'Failed to use credit', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}async function generateReport(reportId: string, vin: string) {
  try {
    const { clearvinReport } = await import('@/lib/clearvin');
    const { html, reportId: clearvinId } = await clearvinReport(vin);
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET status = 'COMPLETED', overall_grade = 'A', risk_score = 100,
       grade_label = 'Full ClearVin Report', grade_colour = '#2563eb',
       ai_summary = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2`,
      clearvinId || '', reportId
    );
    try {
      const pd = JSON.stringify({ clearvin_html: html, clearvin_report_id: clearvinId, data_source: 'CLEARVIN' });
      await prisma.$executeRawUnsafe(`UPDATE reports SET processed_data = $1::jsonb WHERE id = $2`, pd, reportId);
    } catch { /* non-fatal */ }
  } catch (err) {
    console.error('ClearVin generate error:', err);
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
        recallsList = (rd.results||[]).map((r: Record<string,unknown>) => ({ recall_number: r.NHTSACampaignNumber||'', component: r.Component||'' }));
      }
      const score = Math.max(0, 100 - recallsList.length * 5);
      const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
      const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':'Poor';
      const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':'#dc2626';
      const pd = JSON.stringify({ vehicle: vehicleData, recalls: recallsList, data_source:'NHTSA_FALLBACK' });
      await prisma.$executeRawUnsafe(`UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2, grade_label=$3, grade_colour=$4, completed_at=NOW(), updated_at=NOW() WHERE id=$5`, grade, score, label, colour, reportId);
      try { await prisma.$executeRawUnsafe(`UPDATE reports SET processed_data=$1::jsonb WHERE id=$2`, pd, reportId); } catch {}
    } catch {
      await prisma.$executeRawUnsafe(`UPDATE reports SET status='FAILED', updated_at=NOW() WHERE id=$1`, reportId);
    }
  }
}

