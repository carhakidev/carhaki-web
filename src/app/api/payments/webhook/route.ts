import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { generateReportAndEmail } from '@/lib/generate';

export const maxDuration = 60;

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

      const orders = await prisma.$queryRawUnsafe(
        `SELECT id, vin, payment_status, user_id, guest_name, guest_email FROM orders WHERE paystack_reference = $1 LIMIT 1`,
        reference
      ) as Array<{ id: string; vin: string; payment_status: string; user_id: string; guest_name: string; guest_email: string }>;

      const order = orders[0];
      if (!order) return NextResponse.json({ received: true });
      if (order.payment_status === 'SUCCESS') return NextResponse.json({ received: true });

      await prisma.$executeRawUnsafe(
        `UPDATE orders SET payment_status = 'SUCCESS', paid_at = NOW(), updated_at = NOW() WHERE paystack_reference = $1`,
        reference
      );

      console.log('[webhook] Order:', order.id, '| VIN:', order.vin, '| email:', order.guest_email);

      const reports = await prisma.$queryRawUnsafe(
        `SELECT id FROM reports WHERE order_id = $1 LIMIT 1`, order.id
      ) as Array<{ id: string }>;

      if (!reports[0]) {
        const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'PROCESSING', $5, false, NOW(), NOW())`,
          reportId, order.id, order.user_id, order.vin, shareToken
        );

        console.log('[webhook] Running generate directly for:', reportId);

        // Run generate directly — await so Vercel doesn't kill it
        await generateReportAndEmail(reportId, order.vin, order.guest_name, order.guest_email);

        console.log('[webhook] Generate complete for:', reportId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error:', error);
    return NextResponse.json({ received: true });
  }
}
