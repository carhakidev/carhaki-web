import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function calculateGrade(recalls: unknown[], accidents: unknown[], theft: unknown[]): { grade: string; score: number; label: string; colour: string } {
  let score = 100;
  score -= recalls.length * 5;
  score -= accidents.length * 20;
  score -= theft.length * 30;
  score = Math.max(0, score);
  if (score >= 90) return { grade: 'A', score, label: 'Excellent', colour: '#16a34a' };
  if (score >= 75) return { grade: 'B', score, label: 'Good', colour: '#2563eb' };
  if (score >= 55) return { grade: 'C', score, label: 'Fair', colour: '#d97706' };
  if (score >= 35) return { grade: 'D', score, label: 'Poor', colour: '#ea580c' };
  return { grade: 'F', score, label: 'High Risk', colour: '#dc2626' };
}

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
    const [nhtsaRes, recallsRes] = await Promise.allSettled([
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`),
      fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`),
    ]);

    let vehicleData: Record<string, unknown> = {};
    let nhtsaRaw: Record<string, unknown> = {};
    let recallsList: unknown[] = [];

    if (nhtsaRes.status === 'fulfilled' && nhtsaRes.value.ok) {
      nhtsaRaw = await nhtsaRes.value.json();
      const r = (nhtsaRaw as { Results?: Record<string, unknown>[] }).Results?.[0] ?? {};
      vehicleData = {
        vin, make: r.Make || null, model: r.Model || null,
        year: r.ModelYear ? parseInt(r.ModelYear as string) : null,
        trim: r.Trim || null,
        engine: r.DisplacementL ? `${parseFloat(r.DisplacementL as string).toFixed(1)}L` : null,
        fuel_type: r.FuelTypePrimary || null, drive_type: r.DriveType || null,
        body_type: r.BodyClass || null, country_of_manufacture: r.PlantCountry || null,
        doors: r.Doors ? parseInt(r.Doors as string) : null,
      };
    }

    if (recallsRes.status === 'fulfilled' && recallsRes.value.ok) {
      const recallData = await recallsRes.value.json();
      recallsList = (recallData.results || []).map((r: Record<string, unknown>) => ({
        recall_number: r.NHTSACampaignNumber || '',
        component: r.Component || '',
        summary: r.Summary || '',
        remedy: r.Remedy || null,
        is_open: true,
      }));
    }

    const accidents: unknown[] = [];
    const theft: unknown[] = [];
    const odometerRecords: unknown[] = [];
    const { grade, score, label, colour } = calculateGrade(recallsList, accidents, theft);

    const processedData = JSON.stringify({
      vehicle: vehicleData, recalls: recallsList,
      accidents, theft, odometer_records: odometerRecords, data_source: 'NHTSA',
    });

    await prisma.$executeRawUnsafe(`
      UPDATE reports SET
        status = 'COMPLETED',
        overall_grade = $1,
        risk_score = $2,
        grade_label = $3,
        grade_colour = $4,
        processed_data = $5::jsonb,
        raw_nhtsa_data = $6::jsonb,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $7
    `, grade, score, label, colour, processedData, JSON.stringify(nhtsaRaw), report_id);

    return NextResponse.json({ status: 'completed', report_id, grade, score });
  } catch (err) {
    console.error('Report generation error:', err);
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET status = 'FAILED', updated_at = NOW() WHERE id = $1`, report_id
    );
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
