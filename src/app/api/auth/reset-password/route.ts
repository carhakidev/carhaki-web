import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'Token and password required' }, { status: 400 });

    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    if (!/[A-Z]/.test(password)) return NextResponse.json({ error: 'Password must contain at least one uppercase letter.' }, { status: 400 });
    if (!/[0-9]/.test(password)) return NextResponse.json({ error: 'Password must contain at least one number.' }, { status: 400 });

    const resets = await prisma.$queryRawUnsafe(
      `SELECT user_id, expires_at FROM password_resets WHERE token = $1 LIMIT 1`,
      token
    ) as Array<{ user_id: string; expires_at: Date }>;

    if (!resets[0]) return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
    if (new Date() > new Date(resets[0].expires_at)) {
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.$executeRawUnsafe(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      hash, resets[0].user_id
    );
    await prisma.$executeRawUnsafe(`DELETE FROM password_resets WHERE user_id = $1`, resets[0].user_id);

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
