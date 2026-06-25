import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { vin, bundle_id } = await req.json();
    const upperVin = vin?.toUpperCase();
    const refCode = req.cookies.get('carhaki_ref')?.value || null;

    if (!upperVin || upperVin.length !== 17) {
      return NextResponse.json({ error: 'Invalid VIN.' }, { status: 400 });
    }

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 503 });
    }

    const BUNDLES: Record<string, { price: number; count: number }> = {
      single: { price: 15000, count: 1 },
      triple: { price: 35000, count: 3 },
      five:   { price: 50000, count: 5 },
    };
    const bundleKey = bundle_id && BUNDLES[bundle_id] ? bundle_id : 'single';
    const bundle = BUNDLES[bundleKey];
    const priceKobo = bundle.price * 100;

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
          bundle_id: bundleKey,
          bundle_count: bundle.count,
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

    const id = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO orders (id, user_id, vin, amount_ngn, paystack_reference, paystack_access_code, payment_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW(), NOW())
    `, id, session.user.id, upperVin, priceKobo, reference, paystackData.data.access_code || null);

    // Record referral commission if ref code exists
    if (refCode) {
      try {
        const refCodes = await prisma.$queryRawUnsafe(
          `SELECT id FROM referral_codes WHERE code = $1 AND is_active = true LIMIT 1`,
          refCode
        ) as Array<{ id: string }>;

        if (refCodes[0]) {
          const commissionMap: Record<string, number> = { single: 250000, triple: 500000, five: 750000 };
          const commission = commissionMap[bundleKey] || 250000;
          const refId = `rfrl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO referrals (id, referral_code_id, order_id, user_id, amount_ngn, commission_ngn, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            refId, refCodes[0].id, id, session.user.id, priceKobo, commission
          );
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      order_id: id,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
      amount_ngn: bundle.price,
      bundle_count: bundle.count,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Order creation failed.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
