import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { vin, bundle_id, count, amount } = await req.json();
    const upperVin = vin?.toUpperCase();

    if (!upperVin || upperVin.length !== 17) {
      return NextResponse.json({ error: 'Invalid VIN.' }, { status: 400 });
    }

    // Validate bundle pricing
    const BUNDLES: Record<string, { price: number; count: number }> = {
      single: { price: 15000, count: 1 },
      triple: { price: 39000, count: 3 },
      five:   { price: 60000, count: 5 },
    };
    const bundleKey = bundle_id && BUNDLES[bundle_id] ? bundle_id : 'single';
    const bundle = BUNDLES[bundleKey];
    const priceKobo = bundle.price * 100;

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 503 });
    }

    const reference = `CH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        amount: priceKobo,
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

    // Use raw SQL to avoid Prisma enum issues
    const id = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO orders (id, user_id, vin, amount_ngn, paystack_reference, paystack_access_code, payment_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW(), NOW())
    `, id, session.user.id, upperVin, priceKobo, reference, paystackData.data.access_code || null);

    return NextResponse.json({
      order_id: id,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
      amount_ngn: bundle.price,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Order creation failed.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
