'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [reportId, setReportId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!reference) { router.push('/dashboard'); return; }

    const verify = async (tries = 0): Promise<void> => {
      try {
        const res = await fetch(`/api/payments/verify?reference=${reference}`);
        const data = await res.json();

        if (data.status === 'success' || data.status === 'already_verified') {
          setReportId(data.report_id);
          setStatus('success');
          return;
        }

        // Paystack sometimes takes a moment — retry up to 4 times
        if (tries < 4) {
          setAttempt(tries + 1);
          await new Promise((r) => setTimeout(r, 2000));
          return verify(tries + 1);
        }

        setStatus('failed');
      } catch {
        if (tries < 4) {
          await new Promise((r) => setTimeout(r, 2000));
          return verify(tries + 1);
        }
        setStatus('failed');
      }
    };

    // Give Paystack 1 second before first check
    setTimeout(() => verify(), 1000);
  }, [reference, router]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-ch-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-ch-blue mx-auto mb-4" />
          <p className="text-ch-text font-semibold">Verifying your payment...</p>
          <p className="text-ch-text-muted text-sm mt-1">
            {attempt > 0 ? `Checking again (${attempt}/4)...` : 'Please wait'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-ch-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-ch-red-light rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-ch-text mb-2">Payment Not Confirmed</h1>
          <p className="text-ch-text-secondary mb-6">
            We couldn&apos;t confirm your payment yet. If you were charged, your report will appear in your dashboard shortly — or email carhakisupport@gmail.com.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard">
              <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white">Check My Dashboard</Button>
            </Link>
            <a href="https://chat.whatsapp.com/CL4YVA9Ny0gG6vWfFIAQZP?mode=gi_t">
              <Button variant="outline" className="w-full border-ch-border">Contact Support</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-ch-border rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-ch-green-light rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-ch-green" />
        </div>
        <div className="bg-ch-green-light border border-green-200 rounded-lg px-4 py-2 text-ch-green text-sm font-medium mb-4">
          Payment confirmed! Your report is being generated.
        </div>
        <h1 className="text-2xl font-bold text-ch-text mb-2">Payment Successful!</h1>
        <p className="text-ch-text-secondary mb-6">
          Your report is ready in seconds. Credits from bundle purchases are saved to your account.
        </p>
        <div className="flex flex-col gap-3">
          {reportId && (
            <Link href={`/reports/${reportId}`}>
              <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white">View Report →</Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button variant="outline" className="w-full border-ch-border">My Dashboard</Button>
          </Link>
        </div>
        <p className="text-xs text-ch-text-muted mt-4">
          Questions?{' '}
          <a href="mailto:carhakisupport@gmail.com" className="text-ch-blue hover:underline">carhakisupport@gmail.com</a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ch-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-ch-blue" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
