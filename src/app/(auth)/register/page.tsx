'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.password_confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create account
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }

      // 2. Auto sign-in
      const result = await signIn('credentials', {
        email: form.email.toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        // Account created but auto-login failed — send to login
        router.push('/login');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Registration failed. Please try again.');
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
          <h1 className="text-2xl font-bold text-ch-text mb-1">Create your account</h1>
          <p className="text-ch-text-secondary text-sm mb-6">
            Start checking Tokunbo cars before you buy
          </p>

          {error && (
            <div className="bg-ch-red-light border border-red-200 text-ch-red text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name" className="text-sm font-medium text-ch-text">First name</Label>
                <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange}
                  placeholder="Ali" required className="mt-1 border-ch-border focus-visible:ring-ch-blue" />
              </div>
              <div>
                <Label htmlFor="last_name" className="text-sm font-medium text-ch-text">Last name</Label>
                <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange}
                  placeholder="Muhammad" required className="mt-1 border-ch-border focus-visible:ring-ch-blue" />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-ch-text">Email address</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" required className="mt-1 border-ch-border focus-visible:ring-ch-blue" />
            </div>

            <div>
              <Label htmlFor="phone_number" className="text-sm font-medium text-ch-text">Phone number</Label>
              <Input id="phone_number" name="phone_number" type="tel" value={form.phone_number} onChange={handleChange}
                placeholder="+234 800 000 0000" className="mt-1 border-ch-border focus-visible:ring-ch-blue" />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-ch-text">Password</Label>
              <div className="relative mt-1">
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={handleChange} placeholder="Min. 8 characters" required
                  className="border-ch-border focus-visible:ring-ch-blue pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ch-text-muted hover:text-ch-text">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="password_confirm" className="text-sm font-medium text-ch-text">Confirm password</Label>
              <Input id="password_confirm" name="password_confirm" type="password"
                value={form.password_confirm} onChange={handleChange} placeholder="••••••••" required
                className="mt-1 border-ch-border focus-visible:ring-ch-blue" />
            </div>

            <Button type="submit" disabled={loading}
              className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white h-11 mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-ch-text-secondary mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-ch-blue font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-ch-text-muted mt-6">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="text-ch-blue hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-ch-blue hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
