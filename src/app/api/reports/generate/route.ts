import { NextRequest, NextResponse } from 'next/server';
import { generateReportAndEmail } from '@/lib/generate';

// Increase function timeout to 60 seconds (requires Vercel Pro)
// On hobby plan this is ignored but won't break
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key');
  if (internalKey !== (process.env.INTERNAL_API_KEY || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { report_id, vin, guest_name, guest_email } = await req.json();
  if (!report_id || !vin) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  await generateReportAndEmail(report_id, vin, guest_name, guest_email);

  return NextResponse.json({ status: 'completed', report_id });
}
