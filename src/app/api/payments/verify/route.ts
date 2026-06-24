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

    const orders = await prisma.$queryRawUnsafe(
      `SELECT id, vin, payment_status, user_id FROM orders WHERE paystack_reference = $1 LIMIT 1`,
      reference
    ) as Array<{ id: string; vin: string; payment_status: string; user_id: string }>;

    const existingOrder = orders[0];
    if (!existingOrder) {
      return NextResponse.json({ status: 'failed', message: 'Order not found' });
    }

    if (existingOrder.payment_status === 'SUCCESS') {
      const reports = await prisma.$queryRawUnsafe(
        `SELECT id FROM reports WHERE order_id = $1 LIMIT 1`,
        existingOrder.id
      ) as Array<{ id: string }>;
      return NextResponse.json({
        status: 'already_verified',
        report_id: reports[0]?.id ?? null,
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

    // Get bundle info from metadata
    const metadata = psData.data?.metadata || {};
    const bundleCount = parseInt(metadata.bundle_count || '1');

    // Update order
    await prisma.$executeRawUnsafe(
      `UPDATE orders SET payment_status = 'SUCCESS', paid_at = NOW(), updated_at = NOW() WHERE paystack_reference = $1`,
      reference
    );

    // Create first report for the VIN checked
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PENDING', $5, false, NOW(), NOW())`,
      reportId, existingOrder.id, session.user.id, existingOrder.vin, shareToken
    );

    // Store remaining credits if bundle
    const remainingCredits = bundleCount - 1;
    if (remainingCredits > 0) {
      const creditId = `cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO report_credits (id, user_id, order_id, total_credits, used_credits, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 1, NOW(), NOW())`,
        creditId, session.user.id, existingOrder.id, bundleCount
      );
    }

    // Trigger generation
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com';
    fetch(`${baseUrl}/api/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
      body: JSON.stringify({ report_id: reportId, vin: existingOrder.vin }),
    }).catch(() => {});

    return NextResponse.json({ status: 'success', report_id: reportId, vin: existingOrder.vin });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json(
      { error: 'Verification failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
