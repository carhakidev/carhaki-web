import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Run report generation inline (not fire-and-forget — Vercel kills background fetches)
async function generateReport(reportId: string, vin: string) {
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

    // Calculate grade
    let score = 100;
    score -= recallsList.length * 5;
    score = Math.max(0, score);
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : score >= 35 ? 'D' : 'F';
    const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 55 ? 'Fair' : score >= 35 ? 'Poor' : 'High Risk';
    const colour = score >= 90 ? '#16a34a' : score >= 75 ? '#2563eb' : score >= 55 ? '#d97706' : score >= 35 ? '#ea580c' : '#dc2626';

    const processedData = JSON.stringify({
      vehicle: vehicleData, recalls: recallsList,
      accidents: [], theft: [], odometer_records: [], data_source: 'NHTSA',
    });

    // Update grade and status first (no JSON casting — safer)
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET status = 'COMPLETED', overall_grade = $1, risk_score = $2,
       grade_label = $3, grade_colour = $4, completed_at = NOW(), updated_at = NOW() WHERE id = $5`,
      grade, score, label, colour, reportId
    );
    // Then update JSON data separately
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE reports SET processed_data = $1::jsonb, raw_nhtsa_data = $2::jsonb WHERE id = $3`,
        processedData, JSON.stringify(nhtsaRaw), reportId
      );
    } catch (jsonErr) {
      console.error('JSON update failed (non-fatal):', jsonErr);
    }
  } catch (err) {
    console.error('Inline generate error:', err);
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET status = 'FAILED', updated_at = NOW() WHERE id = $1`, reportId
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reference = req.nextUrl.searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 });
    }

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
    }

    const orders = await prisma.$queryRawUnsafe(
      `SELECT id, vin, payment_status, user_id FROM orders WHERE paystack_reference = $1 LIMIT 1`,
      reference
    ) as Array<{ id: string; vin: string; payment_status: string; user_id: string }>;

    const existingOrder = orders[0];
    if (!existingOrder) {
      return NextResponse.json({ status: 'failed', message: 'Order not found' });
    }

    if (existingOrder.payment_status === 'SUCCESS') {
      const reports = await prisma.$queryRawUnsafe(
        `SELECT id FROM reports WHERE order_id = $1 LIMIT 1`, existingOrder.id
      ) as Array<{ id: string }>;
      return NextResponse.json({
        status: 'already_verified',
        report_id: reports[0]?.id ?? null,
        vin: existingOrder.vin,
      });
    }

    // Verify with Paystack
    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const psData = await psRes.json();

    if (!psData.status || psData.data?.status !== 'success') {
      return NextResponse.json({ status: 'failed', message: 'Payment not confirmed by Paystack' });
    }

    const metadata = psData.data?.metadata || {};
    const bundleCount = parseInt(metadata.bundle_count || '1');

    // Update order
    await prisma.$executeRawUnsafe(
      `UPDATE orders SET payment_status = 'SUCCESS', paid_at = NOW(), updated_at = NOW() WHERE paystack_reference = $1`,
      reference
    );

    // Create report
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PROCESSING', $5, false, NOW(), NOW())`,
      reportId, existingOrder.id, session.user.id, existingOrder.vin, shareToken
    );

    // Store bundle credits
    if (bundleCount > 1) {
      const creditId = `cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO report_credits (id, user_id, order_id, total_credits, used_credits, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 1, NOW(), NOW())`,
        creditId, session.user.id, existingOrder.id, bundleCount
      );
    }

    // Generate report INLINE (not background — Vercel kills background fetches)
    await generateReport(reportId, existingOrder.vin);

    return NextResponse.json({ status: 'success', report_id: reportId, vin: existingOrder.vin });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json(
      { error: 'Verification failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
