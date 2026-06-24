import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const REPORT_PRICE_NGN = 15000;
const REPORT_PRICE_KOBO = REPORT_PRICE_NGN * 100;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { vin } = await req.json();
    const upperVin = vin?.toUpperCase();

    if (!upperVin || upperVin.length !== 17) {
      return NextResponse.json({ error: 'Invalid VIN.' }, { status: 400 });
    }

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 503 });
    }

    const reference = `CH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Initiate Paystack transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        amount: REPORT_PRICE_KOBO,
        reference,
        currency: 'NGN',
        metadata: {
          vin: upperVin,
          user_id: session.user.id,
          report_type: 'US_VEHICLE_REPORT',
        },
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com'}/payments/success`,
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status || !paystackData.data?.authorization_url) {
      console.error('Paystack error:', paystackData);
      return NextResponse.json({ error: 'Could not initiate payment.' }, { status: 502 });
    }

    // Save order — use raw string, cast as never to bypass enum type check
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        vin: upperVin,
        amountNgn: REPORT_PRICE_KOBO,
        paystackReference: reference,
        paystackAccessCode: paystackData.data.access_code,
        paymentStatus: 'PENDING' as never,
      },
    });

    return NextResponse.json({
      order_id: order.id,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
      amount_ngn: REPORT_PRICE_NGN,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Order creation failed.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
