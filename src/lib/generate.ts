import { prisma } from '@/lib/db';
import { clearvinReportWithPDF } from '@/lib/clearvin';
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

  // Fetch NHTSA vehicle info + ClearVin HTML+PDF all in parallel
  let make: string | undefined, model: string | undefined, year: number | undefined;
  let recallsList: unknown[] = [];
  let clearvinHtml: string | null = null;
  let pdfBuffer: ArrayBuffer | null = null;

  const [nhtsaResult, clearvinResult] = await Promise.allSettled([
    // NHTSA decode + recalls in parallel
    Promise.all([
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`),
      fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`),
    ]),
    // ClearVin HTML + PDF in parallel (with timeout)
    Promise.race([
      clearvinReportWithPDF(vin),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('ClearVin timeout')), 8000)),
    ]),
  ]);

  // Process NHTSA result
  if (nhtsaResult.status === 'fulfilled') {
    try {
      const [vinRes, recallRes] = nhtsaResult.value;
      const vinData = await vinRes.json();
      const v = vinData.Results?.[0];
      make = v?.Make || undefined;
      model = v?.Model || undefined;
      year = v?.ModelYear ? parseInt(v.ModelYear) : undefined;
      if (recallRes.ok) recallsList = (await recallRes.json()).results || [];
      console.log('[generate] Vehicle:', { make, model, year, recalls: recallsList.length });
    } catch (e) { console.error('[generate] NHTSA parse failed:', e); }
  } else {
    console.error('[generate] NHTSA fetch failed:', nhtsaResult.reason);
  }

  // Process ClearVin result
  if (clearvinResult.status === 'fulfilled') {
    clearvinHtml = clearvinResult.value.html;
    pdfBuffer = clearvinResult.value.pdfBuffer;
    console.log('[generate] ClearVin OK - PDF:', !!pdfBuffer);
  } else {
    console.warn('[generate] ClearVin failed (using NHTSA fallback):', clearvinResult.reason?.message);
  }

  // Compute grade
  const score = Math.max(0, 100 - recallsList.length * 5);
  const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
  const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':score>=35?'Poor':'High Risk';
  const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':score>=35?'#ea580c':'#dc2626';

  const processedData = clearvinHtml
    ? { data_source: 'CLEARVIN', clearvin_html: clearvinHtml }
    : { data_source: 'NHTSA_FALLBACK', vehicle: { vin, make, model, year }, recalls: recallsList };

  await prisma.$executeRawUnsafe(`
    UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2,
      grade_label=$3, grade_colour=$4,
      processed_data=$5::jsonb, completed_at=NOW(), updated_at=NOW()
    WHERE id=$6
  `, grade, score, label, colour, JSON.stringify(processedData), reportId);

  console.log('[generate] DB saved. data_source:', clearvinHtml ? 'CLEARVIN' : 'NHTSA_FALLBACK');

  // Send email
  if (guestEmail) {
    console.log('[generate] Sending email to:', guestEmail, '| PDF attached:', !!pdfBuffer);
    try {
      await sendReportReadyEmail({
        to: guestEmail,
        name: guestName || guestEmail,
        vin, make, model, year,
        pdfBuffer: pdfBuffer ?? undefined,
      });
      console.log('[generate] EMAIL SENT to:', guestEmail);
    } catch (e) {
      console.error('[generate] Email failed:', e);
      // Mark report failed only if DB also failed — email failure alone isn't fatal
    }
  } else {
    console.warn('[generate] No guestEmail — skipping email');
  }
}
