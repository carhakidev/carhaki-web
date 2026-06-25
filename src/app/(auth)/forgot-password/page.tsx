'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-ch-blue rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">
              <span className="text-ch-text">Car</span>
              <span className="text-ch-blue">Haki</span>
            </span>
          </Link>
        </div>

        <div className="bg-white border border-ch-border rounded-2xl shadow-lg p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h1 className="text-xl font-bold text-ch-text mb-2">Check your email</h1>
              <p className="text-ch-text-secondary text-sm mb-6">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. Check your inbox and spam folder.
              </p>
              <Link href="/login">
                <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white">Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-ch-text mb-1">Forgot password?</h1>
              <p className="text-ch-text-secondary text-sm mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              {error && (
                <div className="bg-ch-red-light border border-red-200 text-ch-red text-sm px-4 py-3 rounded-lg mb-5">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required className="mt-1 border-ch-border focus-visible:ring-ch-blue" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white h-11">
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Send Reset Link
                </Button>
              </form>
              <p className="text-center text-sm text-ch-text-secondary mt-6">
                Remember your password?{' '}
                <Link href="/login" className="text-ch-blue font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
