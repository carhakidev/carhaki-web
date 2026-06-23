import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) return NextResponse.json({ error: 'Config error' }, { status: 500 });

  // Validate Paystack signature
  const signature = req.headers.get('x-paystack-signature');
  const rawBody = await req.text();
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');

  if (hash !== signature) {
    console.warn('Invalid Paystack webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;
    const userId = metadata?.user_id;
    const vin = metadata?.vin;

    if (!reference || !userId || !vin) {
      return NextResponse.json({ received: true });
    }

    // Idempotent: skip if already processed
    const existing = await prisma.order.findUnique({ where: { paystackReference: reference } });
    if (existing?.paymentStatus === 'SUCCESS') {
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.update({
      where: { paystackReference: reference },
      data: { paymentStatus: 'SUCCESS', paidAt: new Date() },
    });

    // Create report if not exists
    const existingReport = await prisma.report.findUnique({ where: { orderId: order.id } });
    if (!existingReport) {
      const report = await prisma.report.create({
        data: { orderId: order.id, userId, vin, status: 'PENDING' },
      });

      // Fire report generation
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com'}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
        body: JSON.stringify({ report_id: report.id, vin }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
