'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock, Zap, CheckCircle2 } from 'lucide-react';
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

const bundles = [
  { id: 'single', label: 'Single Report', count: 1, price: 15000, perReport: 15000, saving: null, badge: null, highlight: false },
  { id: 'triple', label: '3 Reports', count: 3, price: 35000, perReport: 11667, saving: '₦10,000 off', badge: 'Popular', highlight: true },
  { id: 'five', label: '5 Reports', count: 5, price: 50000, perReport: 10000, saving: '₦25,000 off', badge: 'Best Value', highlight: false },
];

export default function PreviewPage() {
  const { vin } = useParams<{ vin: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [preview, setPreview] = useState<VehiclePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState('single');
  const [credits, setCredits] = useState<{ has_credits: boolean; total_remaining: number } | null>(null);
  const [existingReport, setExistingReport] = useState<{ report_id: string; status: string } | null>(null);

  useEffect(() => {
    if (!vin) return;
    fetch(`/api/vehicles/preview/${vin}`)
      .then((r) => r.json())
      .then((data) => { if (data.error) setError(data.error); else setPreview(data); })
      .catch(() => setError('Vehicle not found.'))
      .finally(() => setLoading(false));
  }, [vin]);

  useEffect(() => {
    if (session?.user && vin) {
      fetch('/api/credits')
        .then((r) => r.json())
        .then(setCredits)
        .catch(() => {});
      fetch(`/api/reports/check?vin=${vin}`)
        .then((r) => r.json())
        .then((data) => { if (data.exists) setExistingReport(data); })
        .catch(() => {});
    }
  }, [session, vin]);

  const handleOrder = async () => {
    if (!session?.user) {
      router.push(`/login?next=/preview/${vin}`);
      return;
    }
    setOrdering(true);
    try {
      // If user already has report for this VIN, go there
      if (existingReport) {
        router.push(`/reports/${existingReport.report_id}`);
        return;
      }
      // If user has credits, use one instead of paying
      if (credits?.has_credits) {
        const res = await fetch('/api/credits/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin }),
        });
        const data = await res.json();
        console.log('Credits use response:', JSON.stringify(data));
        if (data.report_id) {
          router.push(`/reports/${data.report_id}`);
          return;
        }
        // Even if no report_id, stop here - don't fall through to payment
        if (data.status === 'success' || res.ok) {
          router.push('/dashboard');
          return;
        }
        // Credit API returned error - show message, don't charge
        alert(data.error || 'Could not use credit. Please try again.');
        setOrdering(false);
        return;
      }
      // Otherwise pay
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin, bundle_id: selectedBundle }),
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

  if (loading) return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-ch-blue mx-auto mb-3" />
        <p className="text-ch-text-secondary">Checking vehicle records...</p>
      </div>
    </div>
  );

  if (error || !preview) return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-ch-text mb-2">Vehicle Not Found</h2>
        <p className="text-ch-text-secondary mb-6">{error || 'No data found for this VIN.'}</p>
        <Button onClick={() => router.push('/search')} className="bg-ch-blue hover:bg-ch-blue-dark text-white">Try Another VIN</Button>
      </div>
    </div>
  );

  const selected = bundles.find((b) => b.id === selectedBundle)!;
  const hasCredits = credits?.has_credits && (credits?.total_remaining ?? 0) > 0;
  const hasExistingReport = !!existingReport;

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Vehicle header */}
        <div className="bg-ch-navy text-white rounded-2xl p-6">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Free Preview</p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{preview.year} {preview.make} {preview.model}</h1>
          {preview.trim && <p className="text-slate-300 text-sm mb-3">{preview.trim}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-slate-700 px-2 py-1 rounded font-mono">{vin}</code>
            <Badge className="bg-ch-blue text-white border-0 text-xs">🇺🇸 USA</Badge>
            {preview.recall_count > 0 && (
              <Badge className="bg-ch-amber text-white border-0 text-xs">⚠ {preview.recall_count} recall{preview.recall_count > 1 ? 's' : ''}</Badge>
            )}
            {(preview as {auction_records?: number}).auction_records > 0 && (
              <Badge className="bg-slate-600 text-white border-0 text-xs">📸 {(preview as {auction_records?: number; images_count?: number}).images_count} auction photos</Badge>
            )}
          </div>
        </div>

        {/* Auction preview image */}
        {(preview as {preview_image?: string}).preview_image && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-700">
            <img
              src={(preview as {preview_image?: string}).preview_image}
              alt={`${preview.year} ${preview.make} ${preview.model} auction photo`}
              className="w-full h-48 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <p className="text-xs text-slate-400 px-3 py-1.5">
              📸 Auction photo · {(preview as {images_count?: number}).images_count || 0} total images in full report
            </p>
          </div>
        )}

        {/* Specs */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ch-text mb-4 uppercase tracking-wide">
            Vehicle Specifications <span className="text-ch-text-muted font-normal normal-case">(included free)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Make', value: preview.make }, { label: 'Model', value: preview.model },
              { label: 'Year', value: preview.year?.toString() }, { label: 'Engine', value: preview.engine },
              { label: 'Fuel Type', value: preview.fuel_type }, { label: 'Drive Type', value: preview.drive_type },
              { label: 'Body Type', value: preview.body_type }, { label: 'Doors', value: preview.doors?.toString() },
              { label: 'Manufactured', value: preview.country_of_manufacture },
            ].map((spec) => spec.value && (
              <div key={spec.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-0.5">{spec.label}</p>
                <p className="text-sm font-semibold text-ch-text">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ch-text mb-3 uppercase tracking-wide">Full Report Includes</h2>
          <ul className="space-y-2 mb-6">
            {reportFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ch-text-secondary">
                <Lock className="w-3.5 h-3.5 text-ch-text-muted shrink-0" />{f}
              </li>
            ))}
          </ul>

          <div className="border-t border-ch-border pt-5">
            <h3 className="text-xl font-bold text-ch-text mb-1">Unlock the Full Report</h3>
            <p className="text-sm text-ch-text-secondary mb-4">Know exactly what you&apos;re buying before spending millions of naira.</p>

            {/* Existing report banner */}
            {hasExistingReport && (
              <div className="flex items-center justify-between gap-2 bg-ch-green-light border border-green-200 rounded-lg px-4 py-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-ch-green">You already have a report for this car</p>
                  <p className="text-xs text-ch-green/70">
                    {existingReport!.status === 'COMPLETED' ? 'Report is ready to view' : 'Report is being generated'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/reports/${existingReport!.report_id}`)}
                  className="bg-ch-green hover:bg-ch-green/90 text-white shrink-0"
                >
                  View Report
                </Button>
              </div>
            )}

            {/* Credits banner */}
            {!hasExistingReport && hasCredits && (
              <div className="flex items-center gap-2 bg-ch-blue-light border border-blue-200 rounded-lg px-4 py-3 mb-4">
                <Zap className="w-4 h-4 text-ch-blue shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-ch-blue">
                    You have {credits!.total_remaining} report credit{credits!.total_remaining > 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-xs text-ch-blue/70">This check will use 1 credit — no payment needed</p>
                </div>
              </div>
            )}

            {/* Bundle selector — only show if no credits and no existing report */}
            {!hasCredits && !hasExistingReport && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {bundles.map((bundle) => (
                    <button
                      key={bundle.id}
                      onClick={() => setSelectedBundle(bundle.id)}
                      className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                        selectedBundle === bundle.id ? 'border-ch-blue bg-ch-blue-light' : 'border-ch-border hover:border-ch-blue/40'
                      }`}
                    >
                      {bundle.badge && (
                        <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          bundle.highlight ? 'bg-ch-blue text-white' : 'bg-ch-amber text-white'
                        }`}>{bundle.badge}</span>
                      )}
                      <p className="text-xs font-semibold text-ch-text mb-1">{bundle.label}</p>
                      <p className="text-base font-bold text-ch-blue">₦{bundle.price.toLocaleString()}</p>
                      <p className="text-[11px] text-ch-text-muted">₦{bundle.perReport.toLocaleString()}/report</p>
                      {bundle.saving && <p className="text-[11px] font-semibold text-ch-green mt-1">{bundle.saving}</p>}
                      {selectedBundle === bundle.id && <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-ch-blue" />}
                    </button>
                  ))}
                </div>
                {selected.saving && (
                  <div className="flex items-center gap-2 bg-ch-green-light border border-green-200 rounded-lg px-3 py-2 mb-4">
                    <Zap className="w-3.5 h-3.5 text-ch-green shrink-0" />
                    <p className="text-xs text-ch-green font-medium">
                      You save {selected.saving} — use reports one at a time for any car
                    </p>
                  </div>
                )}
              </>
            )}

            <Button
              onClick={handleOrder}
              disabled={ordering}
              className="w-full h-12 bg-ch-blue hover:bg-ch-blue-dark text-white text-base font-semibold"
            >
              {ordering ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</> :
               hasExistingReport ? 'View Your Report' :
               hasCredits ? 'Use 1 Credit — Check This Car' :
               session?.user ? `Get ${selected.count > 1 ? selected.count + ' Reports' : 'Full Report'} — ₦${selected.price.toLocaleString()}` :
               `Sign In to Get Report — ₦${selected.price.toLocaleString()}`}
            </Button>

            <div className="flex items-center justify-center gap-2 mt-3">
              <ShieldCheck className="w-4 h-4 text-ch-text-muted" />
              <p className="text-xs text-ch-text-muted">Secured by Paystack · Visa / Mastercard / Bank Transfer / USSD</p>
            </div>
            <div className="mt-4 pt-4 border-t border-ch-border">
              <p className="text-[10px] text-ch-text-muted leading-relaxed">
                <strong>NMVTIS Notice:</strong> This report is obtained from the National Motor Vehicle Title Information System (NMVTIS). 
                Federal law requires NMVTIS data providers to notify you that not all states submit data to NMVTIS, 
                and absence of information does not mean absence of a problem. Reports are for internal use only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
