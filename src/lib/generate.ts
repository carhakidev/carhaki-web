import { prisma } from '@/lib/db';
import { clearvinReport, clearvinReportById } from '@/lib/clearvin';
import { sendReportReadyEmail } from '@/lib/email';

export async function generateReportAndEmail(
  reportId: string,
  vin: string,
  guestName?: string,
  guestEmail?: string
) {
  await prisma.$executeRawUnsafe(
    `UPDATE reports SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1`, reportId
  );

  try {
    const { html, reportId: clearvinReportId } = await clearvinReport(vin);
    if (!html || html.length < 100) throw new Error('ClearVin returned empty report');

    let recallsList: unknown[] = [];
    try {
      const recallsRes = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`);
      if (recallsRes.ok) recallsList = (await recallsRes.json()).results || [];
    } catch { /* optional */ }

    let score = Math.max(0, 100 - recallsList.length * 5);
    let grade = 'A', label = 'Excellent', colour = '#16a34a';
    if (score < 90) { grade = 'B'; label = 'Good'; colour = '#2563eb'; }
    if (score < 75) { grade = 'C'; label = 'Fair'; colour = '#d97706'; }
    if (score < 55) { grade = 'D'; label = 'Poor'; colour = '#ea580c'; }
    if (score < 35) { grade = 'F'; label = 'High Risk'; colour = '#dc2626'; }

    await prisma.$executeRawUnsafe(`
      UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2,
        grade_label=$3, grade_colour=$4,
        processed_data=$5::jsonb, completed_at=NOW(), updated_at=NOW()
      WHERE id=$6
    `, grade, score, label, colour,
      JSON.stringify({ data_source: 'CLEARVIN', clearvin_report_id: clearvinReportId, clearvin_html: html }),
      reportId
    );

    console.log('Report saved:', reportId, '| Emailing:', guestEmail);

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
      } catch { /* optional */ }

      // Get PDF
      let pdfBuffer: ArrayBuffer | undefined;
      if (clearvinReportId) {
        try {
          pdfBuffer = await clearvinReportById(clearvinReportId, 'pdf') as ArrayBuffer;
          console.log('PDF fetched, size:', pdfBuffer?.byteLength);
        } catch (e) { console.error('PDF fetch failed:', e); }
      }

      await sendReportReadyEmail({
        to: guestEmail,
        name: guestName || guestEmail,
        vin, make, model, year, pdfBuffer,
      });
      console.log('Email sent to:', guestEmail);
    }
  } catch (err) {
    console.error('Report generation failed:', err);
    // NHTSA fallback
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
        JSON.stringify({ data_source: 'NHTSA_FALLBACK', vehicle, recalls }),
        reportId
      );
      if (guestEmail) {
        await sendReportReadyEmail({
          to: guestEmail, name: guestName || guestEmail, vin,
          make: vehicle.make || undefined, model: vehicle.model || undefined,
          year: vehicle.year || undefined,
        });
      }
    } catch {
      await prisma.$executeRawUnsafe(
        `UPDATE reports SET status='FAILED', updated_at=NOW() WHERE id=$1`, reportId
      );
    }
  }
}
