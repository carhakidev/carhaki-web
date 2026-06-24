import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Check if already verified
    const existingOrder = await prisma.order.findUnique({
      where: { paystackReference: reference },
      include: { report: true },
    });

    if (existingOrder && existingOrder.paymentStatus.toString() === 'SUCCESS') {
      return NextResponse.json({
        status: 'already_verified',
        report_id: existingOrder.report?.id ?? null,
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

    // Update order
    const order = await prisma.order.update({
      where: { paystackReference: reference },
      data: { paymentStatus: 'SUCCESS' as never, paidAt: new Date() },
    });

    // Create report
    const report = await prisma.report.create({
      data: {
        orderId: order.id,
        userId: session.user.id,
        vin: order.vin,
        status: 'PENDING' as never,
      },
    });

    // Trigger generation (non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com';
    fetch(`${baseUrl}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({ report_id: report.id, vin: order.vin }),
    }).catch(() => {});

    return NextResponse.json({ status: 'success', report_id: report.id, vin: order.vin });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json(
      { error: 'Verification failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
