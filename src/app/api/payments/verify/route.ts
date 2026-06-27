import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get('reference');
    if (!reference) return NextResponse.json({ error: 'Reference required' }, { status: 400 });

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });

    const orders = await prisma.$queryRawUnsafe(
      `SELECT id, vin, payment_status, guest_name, guest_email, guest_phone 
       FROM orders WHERE paystack_reference = $1 LIMIT 1`, reference
    ) as Array<{ id: string; vin: string; payment_status: string; guest_name: string; guest_email: string; guest_phone: string }>;

    const existingOrder = orders[0];
    if (!existingOrder) return NextResponse.json({ status: 'failed', message: 'Order not found' });

    if (existingOrder.payment_status === 'SUCCESS') {
      const reports = await prisma.$queryRawUnsafe(
        `SELECT id FROM reports WHERE order_id = $1 LIMIT 1`, existingOrder.id
      ) as Array<{ id: string }>;
      return NextResponse.json({ status: 'already_verified', report_id: reports[0]?.id ?? null });
    }

    // Verify with Paystack
    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const psData = await psRes.json();

    if (!psData.status || psData.data?.status !== 'success') {
      return NextResponse.json({ status: 'failed', message: 'Payment not confirmed by Paystack' });
    }

    // Update order to SUCCESS
    await prisma.$executeRawUnsafe(
      `UPDATE orders SET payment_status = 'SUCCESS', paid_at = NOW(), updated_at = NOW() 
       WHERE paystack_reference = $1`, reference
    );

    // Create report
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
       VALUES ($1, $2, NULL, $3, 'PROCESSING', $4, true, NOW(), NOW())`,
      reportId, existingOrder.id, existingOrder.vin, shareToken
    );

    // Generate report inline (verify route stays open long enough)
    const { generateReportAndEmail } = await import('@/lib/generate');
    generateReportAndEmail(reportId, existingOrder.vin, existingOrder.guest_name, existingOrder.guest_email)
      .catch((e) => console.error('Background generate error:', e));

    return NextResponse.json({ status: 'success', report_id: reportId, vin: existingOrder.vin });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
