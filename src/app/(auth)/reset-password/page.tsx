'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) return (
    <div className="text-center">
      <p className="text-ch-text-secondary mb-4">Invalid reset link.</p>
      <Link href="/forgot-password" className="text-ch-blue hover:underline">Request a new one</Link>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-xl font-bold text-ch-text mb-2">Password updated!</h1>
      <p className="text-ch-text-secondary text-sm">Redirecting you to sign in...</p>
    </div>
  );

  return (
    <>
      <h1 className="text-2xl font-bold text-ch-text mb-1">Set new password</h1>
      <p className="text-ch-text-secondary text-sm mb-6">Must be at least 8 characters with 1 uppercase and 1 number.</p>
      {error && (
        <div className="bg-ch-red-light border border-red-200 text-ch-red text-sm px-4 py-3 rounded-lg mb-5">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>New Password</Label>
          <div className="relative mt-1">
            <Input type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 chars, 1 uppercase, 1 number" required
              className="border-ch-border focus-visible:ring-ch-blue pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ch-text-muted">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label>Confirm Password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••" required className="mt-1 border-ch-border focus-visible:ring-ch-blue" />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white h-11">
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Update Password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<div className="text-center"><Loader2 className="w-6 h-6 animate-spin text-ch-blue mx-auto" /></div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
