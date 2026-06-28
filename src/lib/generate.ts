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

  // Get vehicle info & recalls in parallel (fast — NHTSA only)
  let make: string | undefined, model: string | undefined, year: number | undefined;
  let recallsList: unknown[] = [];
  try {
    const [vinRes, recallRes] = await Promise.all([
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`),
      fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`),
    ]);
    const vinData = await vinRes.json();
    const v = vinData.Results?.[0];
    make = v?.Make || undefined;
    model = v?.Model || undefined;
    year = v?.ModelYear ? parseInt(v.ModelYear) : undefined;
    if (recallRes.ok) recallsList = (await recallRes.json()).results || [];
    console.log('[generate] Vehicle:', { make, model, year, recalls: recallsList.length });
  } catch (e) { console.error('[generate] NHTSA fetch failed:', e); }

  const score = Math.max(0, 100 - recallsList.length * 5);
  const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
  const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':score>=35?'Poor':'High Risk';
  const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':score>=35?'#ea580c':'#dc2626';

  // Try ClearVin — but with a tight timeout so we don't block email
  let clearvinHtml: string | null = null;
  let clearvinReportId: string | null = null;
  let pdfBuffer: ArrayBuffer | undefined;

  try {
    console.log('[generate] Trying ClearVin...');
    const cvResult = await Promise.race([
      clearvinReport(vin),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('ClearVin timeout')), 6000)),
    ]);
    clearvinHtml = cvResult.html;
    clearvinReportId = cvResult.reportId;
    console.log('[generate] ClearVin OK - html:', clearvinHtml?.length, 'reportId:', clearvinReportId);
  } catch (e) {
    console.warn('[generate] ClearVin skipped (timeout or error):', (e as Error).message);
  }

  // Save report to DB
  const dataSource = clearvinHtml ? 'CLEARVIN' : 'NHTSA_FALLBACK';
  const processedData = clearvinHtml
    ? { data_source: 'CLEARVIN', clearvin_report_id: clearvinReportId, clearvin_html: clearvinHtml }
    : { data_source: 'NHTSA_FALLBACK', vehicle: { vin, make, model, year }, recalls: recallsList };

  await prisma.$executeRawUnsafe(`
    UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2,
      grade_label=$3, grade_colour=$4,
      processed_data=$5::jsonb, completed_at=NOW(), updated_at=NOW()
    WHERE id=$6
  `, grade, score, label, colour, JSON.stringify(processedData), reportId);

  console.log('[generate] DB updated, data_source:', dataSource);

  // Try to get PDF if we have a ClearVin reportId (non-blocking)
  if (clearvinReportId) {
    try {
      pdfBuffer = await Promise.race([
        clearvinReportById(clearvinReportId, 'pdf') as Promise<ArrayBuffer>,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('PDF timeout')), 5000)),
      ]);
      console.log('[generate] PDF size:', pdfBuffer?.byteLength);
    } catch (e) {
      console.warn('[generate] PDF fetch skipped:', (e as Error).message);
    }
  }

  // Send email
  if (guestEmail) {
    console.log('[generate] Sending email to:', guestEmail, '| PDF:', !!pdfBuffer);
    try {
      await sendReportReadyEmail({
        to: guestEmail,
        name: guestName || guestEmail,
        vin, make, model, year, pdfBuffer,
      });
      console.log('[generate] EMAIL SENT to:', guestEmail);
    } catch (e) {
      console.error('[generate] Email send failed:', e);
    }
  } else {
    console.warn('[generate] No guestEmail — skipping email');
  }
}
