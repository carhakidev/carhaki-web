'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { non_field_errors?: string[]; detail?: string } } })
          ?.response?.data?.non_field_errors?.[0] ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid email or password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
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

        {/* Card */}
        <div className="bg-white border border-ch-border rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-ch-text mb-1">Welcome back</h1>
          <p className="text-ch-text-secondary text-sm mb-6">
            Sign in to access your vehicle reports
          </p>

          {error && (
            <div className="bg-ch-red-light border border-red-200 text-ch-red text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-ch-text">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 border-ch-border focus-visible:ring-ch-blue"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-medium text-ch-text">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-ch-blue hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="border-ch-border focus-visible:ring-ch-blue pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ch-text-muted hover:text-ch-text"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white h-11 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-ch-text-secondary mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-ch-blue font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-ch-text-muted mt-6">
          Protected by CarHaki security. Your data is encrypted.
        </p>
      </div>
    </div>
  );
}
