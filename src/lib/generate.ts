import { prisma } from '@/lib/db';
import { clearvinReport, clearvinReportById } from '@/lib/clearvin';
import { sendReportReadyEmail } from '@/lib/email';

export async function generateReportAndEmail(
  reportId: string,
  vin: string,
  guestName?: string,
  guestEmail?: string
) {
  console.log('[generate] START', { reportId, vin, guestEmail });

  await prisma.$executeRawUnsafe(
    `UPDATE reports SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1`, reportId
  );

  try {
    console.log('[generate] Calling ClearVin...');
    const { html, reportId: clearvinReportId } = await clearvinReport(vin);
    console.log('[generate] ClearVin response - html length:', html?.length, '| reportId:', clearvinReportId);

    if (!html || html.length < 100) throw new Error('ClearVin returned empty report');

    let recallsList: unknown[] = [];
    try {
      const recallsRes = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`);
      if (recallsRes.ok) recallsList = (await recallsRes.json()).results || [];
    } catch { /* optional */ }

    const score = Math.max(0, 100 - recallsList.length * 5);
    const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
    const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':score>=35?'Poor':'High Risk';
    const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':score>=35?'#ea580c':'#dc2626';

    await prisma.$executeRawUnsafe(`
      UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2,
        grade_label=$3, grade_colour=$4,
        processed_data=$5::jsonb, completed_at=NOW(), updated_at=NOW()
      WHERE id=$6
    `, grade, score, label, colour,
      JSON.stringify({ data_source: 'CLEARVIN', clearvin_report_id: clearvinReportId, clearvin_html: html }),
      reportId
    );

    console.log('[generate] DB updated. Now sending email to:', guestEmail);

    if (guestEmail) {
      // Get vehicle info
      let make: string | undefined, model: string | undefined, year: number | undefined;
      try {
        const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
        const d = await r.json();
        const v = d.Results?.[0];
        make = v?.Make || undefined;
        model = v?.Model || undefined;
        year = v?.ModelYear ? parseInt(v.ModelYear) : undefined;
        console.log('[generate] Vehicle info:', { make, model, year });
      } catch (e) { console.error('[generate] Vehicle decode failed:', e); }

      // Get PDF — don't block email if this fails
      let pdfBuffer: ArrayBuffer | undefined;
      if (clearvinReportId) {
        try {
          console.log('[generate] Fetching PDF for reportId:', clearvinReportId);
          pdfBuffer = await clearvinReportById(clearvinReportId, 'pdf') as ArrayBuffer;
          console.log('[generate] PDF fetched, size:', pdfBuffer?.byteLength);
        } catch (e) {
          console.error('[generate] PDF fetch failed (will send email without PDF):', e);
        }
      } else {
        console.warn('[generate] No ClearVin reportId extracted — sending email without PDF attachment');
      }

      console.log('[generate] Sending email, PDF attached:', !!pdfBuffer);
      await sendReportReadyEmail({
        to: guestEmail,
        name: guestName || guestEmail,
        vin, make, model, year, pdfBuffer,
      });
      console.log('[generate] EMAIL SENT to:', guestEmail);
    } else {
      console.warn('[generate] No guestEmail — skipping email');
    }

  } catch (err) {
    console.error('[generate] ClearVin failed, trying NHTSA fallback:', err);

    try {
      const nhRes = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
      const nhData = await nhRes.json();
      const v = nhData.Results?.[0] ?? {};
      const rcRes = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`);
      const rcData = await rcRes.json();
      const recalls = (rcData.results || []).map((r: Record<string,unknown>) => ({
        recall_number: r.NHTSACampaignNumber||'', component: r.Component||'', summary: r.Summary||''
      }));
      const score = Math.max(0, 100 - recalls.length * 5);
      const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
      const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':score>=35?'Poor':'High Risk';
      const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':score>=35?'#ea580c':'#dc2626';
      const vehicle = { vin, make: v.Make||null, model: v.Model||null, year: v.ModelYear?parseInt(v.ModelYear):null };

      await prisma.$executeRawUnsafe(`
        UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2,
          grade_label=$3, grade_colour=$4,
          processed_data=$5::jsonb, completed_at=NOW(), updated_at=NOW()
        WHERE id=$6
      `, grade, score, label, colour,
        JSON.stringify({ data_source: 'NHTSA_FALLBACK', vehicle, recalls }), reportId
      );

      if (guestEmail) {
        console.log('[generate] Sending NHTSA fallback email to:', guestEmail);
        await sendReportReadyEmail({
          to: guestEmail, name: guestName || guestEmail, vin,
          make: vehicle.make || undefined,
          model: vehicle.model || undefined,
          year: vehicle.year || undefined,
        });
        console.log('[generate] NHTSA fallback EMAIL SENT to:', guestEmail);
      }
    } catch (fallbackErr) {
      console.error('[generate] NHTSA fallback also failed:', fallbackErr);
      await prisma.$executeRawUnsafe(
        `UPDATE reports SET status='FAILED', updated_at=NOW() WHERE id=$1`, reportId
      );
    }
  }
}
