'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus] = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) { router.push('/dashboard'); return; }

    api.get(`/api/payments/verify/?reference=${reference}`)
      .then((res) => {
        if (res.data.status === 'success' || res.data.status === 'already_verified') {
          setReportId(res.data.report_id);
          setStatus('success');
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reference, router]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-ch-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-ch-blue mx-auto mb-4" />
          <p className="text-ch-text font-semibold">Verifying your payment...</p>
          <p className="text-ch-text-muted text-sm mt-1">Please wait</p>
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
          <h1 className="text-2xl font-bold text-ch-text mb-2">Payment Failed</h1>
          <p className="text-ch-text-secondary mb-6">
            Your payment could not be verified. If you were charged, please contact us on WhatsApp.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/search">
              <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white">Try Again</Button>
            </Link>
            <a href="https://wa.me/2349067816736">
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
          Your report is being generated now. This usually takes under 30 seconds.
        </p>

        <div className="bg-slate-50 border border-ch-border rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-ch-green rounded-full animate-pulse" />
            <p className="text-sm font-semibold text-ch-green">Report status: Completed</p>
          </div>
          <p className="text-xs text-ch-text-muted">
            US Vehicle Report · {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {reportId && (
            <Link href={`/reports/${reportId}`}>
              <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white">
                View Report →
              </Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button variant="outline" className="w-full border-ch-border">My Dashboard</Button>
          </Link>
        </div>

        <p className="text-xs text-ch-text-muted mt-4">
          Questions?{' '}
          <a href="https://wa.me/2349067816736" className="text-ch-blue hover:underline">WhatsApp us</a>
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
