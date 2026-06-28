import { NextRequest, NextResponse } from 'next/server';
import { generateAISummary } from '@/lib/ai-summary';
import { sendAnalysisEmail } from '@/lib/email';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key');
  if (internalKey !== (process.env.INTERNAL_API_KEY || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { vin, html, guest_name, guest_email, make, model, year } = await req.json();
  if (!vin || !html || !guest_email) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  try {
    console.log('Generating AI summary for:', vin);
    const aiSummary = await generateAISummary(vin, html);
    console.log('AI summary length:', aiSummary?.length);

    if (aiSummary) {
      await sendAnalysisEmail({
        to: guest_email,
        name: guest_name || guest_email,
        vin, make, model, year,
        aiSummary,
      });
      console.log('=== EMAIL 2 SENT (AI Analysis) === to:', guest_email);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Analyze route error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
