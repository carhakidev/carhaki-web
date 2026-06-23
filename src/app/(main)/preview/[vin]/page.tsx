'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { VehiclePreview } from '@/types/report';

const reportFeatures = [
  'Full title history (salvage / rebuilt / flood)',
  'Odometer timeline — detect rollback',
  'Accident & damage records',
  'Open NHTSA recall alerts',
  'Theft records',
  'AI plain-English summary',
  'Overall grade (A–F) with risk score',
];

export default function PreviewPage() {
  const { vin } = useParams<{ vin: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [preview, setPreview] = useState<VehiclePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (!vin) return;
    fetch(`/api/vehicles/preview/${vin}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setPreview(data);
      })
      .catch(() => setError('Vehicle not found. Please check the VIN and try again.'))
      .finally(() => setLoading(false));
  }, [vin]);

  const handleOrder = async () => {
    if (!session?.user) {
      router.push(`/login?next=/preview/${vin}`);
      return;
    }
    setOrdering(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.error || 'Order failed');
      }
    } catch (err) {
      setOrdering(false);
      alert(err instanceof Error ? err.message : 'Could not create order. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ch-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ch-blue mx-auto mb-3" />
          <p className="text-ch-text-secondary">Checking vehicle records...</p>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-ch-text mb-2">Vehicle Not Found</h2>
          <p className="text-ch-text-secondary mb-6">{error || 'No data found for this VIN.'}</p>
          <Button onClick={() => router.push('/search')} className="bg-ch-blue hover:bg-ch-blue-dark text-white">
            Try Another VIN
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Vehicle header */}
        <div className="bg-ch-navy text-white rounded-2xl p-6">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Free Preview</p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            {preview.year} {preview.make} {preview.model}
          </h1>
          {preview.trim && <p className="text-slate-300 text-sm mb-3">{preview.trim}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-slate-700 px-2 py-1 rounded font-mono">{vin}</code>
            <Badge className="bg-ch-blue text-white border-0 text-xs">🇺🇸 USA</Badge>
            {preview.recall_count > 0 && (
              <Badge className="bg-ch-amber text-white border-0 text-xs">
                ⚠ {preview.recall_count} recall{preview.recall_count > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Specs */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ch-text mb-4 uppercase tracking-wide">
            Vehicle Specifications <span className="text-ch-text-muted font-normal normal-case">(included free)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Make', value: preview.make },
              { label: 'Model', value: preview.model },
              { label: 'Year', value: preview.year?.toString() },
              { label: 'Engine', value: preview.engine },
              { label: 'Fuel Type', value: preview.fuel_type },
              { label: 'Drive Type', value: preview.drive_type },
              { label: 'Body Type', value: preview.body_type },
              { label: 'Doors', value: preview.doors?.toString() },
              { label: 'Manufactured', value: preview.country_of_manufacture },
            ].map((spec) => spec.value && (
              <div key={spec.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-0.5">{spec.label}</p>
                <p className="text-sm font-semibold text-ch-text">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full report CTA */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ch-text mb-3 uppercase tracking-wide">Full Report Includes</h2>
          <ul className="space-y-2 mb-6">
            {reportFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ch-text-secondary">
                <Lock className="w-3.5 h-3.5 text-ch-text-muted shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div className="border-t border-ch-border pt-5">
            <h3 className="text-xl font-bold text-ch-text mb-1">Unlock the Full Report</h3>
            <p className="text-sm text-ch-text-secondary mb-4">
              Know exactly what you&apos;re buying before spending millions of naira.
            </p>

            <Button
              onClick={handleOrder}
              disabled={ordering}
              className="w-full h-12 bg-ch-blue hover:bg-ch-blue-dark text-white text-base font-semibold"
            >
              {ordering
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                : session?.user
                  ? 'Get Full Report — ₦15,000'
                  : 'Sign In to Get Report — ₦15,000'
              }
            </Button>

            <div className="flex items-center justify-center gap-2 mt-3">
              <ShieldCheck className="w-4 h-4 text-ch-text-muted" />
              <p className="text-xs text-ch-text-muted">
                Secured by Paystack · Visa / Mastercard / Bank Transfer / USSD
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
