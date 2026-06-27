import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) return NextResponse.json({ error: 'Config error' }, { status: 500 });

    const signature = req.headers.get('x-paystack-signature');
    const rawBody = await req.text();
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const { reference } = event.data;
      if (!reference) return NextResponse.json({ received: true });

      // Use raw SQL to avoid Prisma enum issues
      const orders = await prisma.$queryRawUnsafe(
        `SELECT id, vin, payment_status, user_id, guest_name, guest_email FROM orders WHERE paystack_reference = $1 LIMIT 1`,
        reference
      ) as Array<{ id: string; vin: string; payment_status: string; user_id: string; guest_name: string; guest_email: string }>;

      const order = orders[0];
      if (!order) return NextResponse.json({ received: true });
      if (order.payment_status === 'SUCCESS') return NextResponse.json({ received: true });

      // Update order status
      await prisma.$executeRawUnsafe(
        `UPDATE orders SET payment_status = 'SUCCESS', paid_at = NOW(), updated_at = NOW() WHERE paystack_reference = $1`,
        reference
      );

      console.log('Webhook: order found:', order.id, 'vin:', order.vin, 'guest_email:', order.guest_email);
      // Check if report already exists
      const reports = await prisma.$queryRawUnsafe(
        `SELECT id FROM reports WHERE order_id = $1 LIMIT 1`, order.id
      ) as Array<{ id: string }>;

      console.log('Webhook: existing report:', reports[0]?.id || 'none');
      if (!reports[0]) {
        const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'PROCESSING', $5, false, NOW(), NOW())`,
          reportId, order.id, order.user_id, order.vin, shareToken
        );

        // Trigger report generation
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com';
        fetch(`${baseUrl}/api/reports/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': process.env.INTERNAL_API_KEY || '',
          },
          body: JSON.stringify({ 
            report_id: reportId, 
            vin: order.vin,
            guest_name: order.guest_name || null,
            guest_email: order.guest_email || null,
          }),
        }).catch((e) => console.error('Webhook generate fetch failed:', e));
        console.log('Webhook: generate triggered for:', reportId, 'guest_email:', order.guest_email);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ received: true });
  }
}
