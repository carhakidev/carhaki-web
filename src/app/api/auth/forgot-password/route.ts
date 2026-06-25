import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const users = await prisma.$queryRawUnsafe(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      email.toLowerCase()
    ) as Array<{ id: string }>;

    // Always return success to prevent email enumeration
    if (!users[0]) {
      return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Store token in DB
    await prisma.$executeRawUnsafe(`
      INSERT INTO password_resets (id, user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE SET token = $3, expires_at = $4, created_at = NOW()
    `, `rst_${Date.now()}`, users[0].id, token, expires);

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com'}/reset-password?token=${token}`;

    // Send email via Resend if configured, otherwise log
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'CarHaki <noreply@carhaki.com>',
          to: email.toLowerCase(),
          subject: 'Reset your CarHaki password',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="color:#0f172a">Reset your password</h2>
              <p style="color:#475569">Click the button below to reset your CarHaki password. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
              <p style="color:#94a3b8;font-size:12px">If you didn't request this, ignore this email.</p>
            </div>
          `,
        }),
      });
    } else {
      console.log('Password reset URL:', resetUrl);
    }

    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
