import { NextRequest, NextResponse } from 'next/server';
import { generateReportAndEmail } from '@/lib/generate';

// 60s timeout — requires Vercel Pro; on Hobby capped at 10s
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key');
  if (internalKey !== (process.env.INTERNAL_API_KEY || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { report_id, vin, guest_name, guest_email } = await req.json();
  if (!report_id || !vin) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  console.log('Generate route called for:', report_id, 'vin:', vin, 'email:', guest_email);

  // Run generation — on Pro this completes within 60s; on Hobby may timeout but webhook retries
  try {
    await generateReportAndEmail(report_id, vin, guest_name, guest_email);
    console.log('Generate completed for:', report_id);
    return NextResponse.json({ status: 'completed', report_id });
  } catch (err) {
    console.error('Generate route error:', err);
    return NextResponse.json({ status: 'error', report_id }, { status: 500 });
  }
}
