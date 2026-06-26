'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock, Zap, CheckCircle2, Users, Gauge, FileText, AlertTriangle, ShoppingCart, Flame, Tag, Car, Shield, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { VehiclePreview } from '@/types/report';

const bundles = [
  { id: 'single', label: 'Single Report', count: 1, price: 15000, perReport: 15000, saving: null, badge: null, highlight: false },
  { id: 'triple', label: '3 Reports', count: 3, price: 35000, perReport: 11667, saving: '₦10,000 off', badge: 'Popular', highlight: true },
  { id: 'five', label: '5 Reports', count: 5, price: 50000, perReport: 10000, saving: '₦25,000 off', badge: 'Best Value', highlight: false },
];

type SummaryCard = {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'lock';
};

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
      fetch('/api/credits').then((r) => r.json()).then(setCredits).catch(() => {});
      fetch(`/api/reports/check?vin=${vin}`)
        .then((r) => r.json())
        .then((data) => { if (data.exists) setExistingReport(data); })
        .catch(() => {});
    }
  }, [session, vin]);

  const handleOrder = async () => {
    if (!session?.user) { router.push(`/login?next=/preview/${vin}`); return; }
    setOrdering(true);
    try {
      if (existingReport) { router.push(`/reports/${existingReport.report_id}`); return; }
      if (credits?.has_credits) {
        const res = await fetch('/api/credits/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vin }),
        });
        const data = await res.json();
        if (data.report_id) { router.push(`/reports/${data.report_id}`); return; }
        if (data.status === 'success' || res.ok) { router.push('/dashboard'); return; }
        alert(data.error || 'Could not use credit. Please try again.');
        setOrdering(false);
        return;
      }
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin, bundle_id: selectedBundle }),
      });
      const data = await res.json();
      if (data.authorization_url) { window.location.href = data.authorization_url; }
      else throw new Error(data.error || 'Order failed');
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

  const p = preview as VehiclePreview & {
    preview_image?: string;
    images_count?: number;
    auction_records?: number;
    ownership_records?: number;
    odometer_reading?: string;
    title_records?: number;
    sale_records?: number;
    junk_salvage_records?: number;
    title_brand_records?: number;
    accident_records?: number;
    insurance_records?: number;
    lien_records?: number;
  };

  const recallCount = preview.recall_count ?? 0;

  const summaryCards: SummaryCard[] = [
    {
      icon: <Users className="w-6 h-6" />,
      label: 'Ownership History',
      value: p.ownership_records != null ? (p.ownership_records === 0 ? 'No Records Reported' : `${p.ownership_records} record(s) found`) : 'Locked',
      status: p.ownership_records != null ? (p.ownership_records === 0 ? 'ok' : 'warn') : 'lock',
    },
    {
      icon: <Gauge className="w-6 h-6" />,
      label: 'Odometer Reading',
      value: p.odometer_reading ?? 'Locked',
      status: p.odometer_reading ? 'ok' : 'lock',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      label: 'Title History',
      value: p.title_records != null ? (p.title_records === 0 ? 'No Records Reported' : `${p.title_records} record(s) found`) : 'Locked',
      status: p.title_records != null ? (p.title_records === 0 ? 'ok' : 'warn') : 'lock',
    },
    {
      icon: <AlertTriangle className="w-6 h-6" />,
      label: 'Recalls',
      value: recallCount === 0 ? 'No Records Reported' : `${recallCount} record(s) found`,
      status: recallCount === 0 ? 'ok' : 'warn',
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      label: 'Sale History',
      value: p.sale_records != null ? (p.sale_records === 0 ? 'No Records Reported' : `${p.sale_records} record(s) found`) : 'Locked',
      status: p.sale_records != null ? (p.sale_records === 0 ? 'ok' : 'warn') : 'lock',
    },
    {
      icon: <Flame className="w-6 h-6" />,
      label: 'Junk & Salvage',
      value: p.junk_salvage_records != null ? (p.junk_salvage_records === 0 ? 'No Records Reported' : `${p.junk_salvage_records} record(s) found`) : 'Locked',
      status: p.junk_salvage_records != null ? (p.junk_salvage_records === 0 ? 'ok' : 'warn') : 'lock',
    },
    {
      icon: <Tag className="w-6 h-6" />,
      label: 'Title Brands',
      value: p.title_brand_records != null ? (p.title_brand_records === 0 ? 'No Records Reported' : `${p.title_brand_records} record(s) found`) : 'Locked',
      status: p.title_brand_records != null ? (p.title_brand_records === 0 ? 'ok' : 'warn') : 'lock',
    },
    {
      icon: <Car className="w-6 h-6" />,
      label: 'Accident & Damage',
      value: p.accident_records != null ? (p.accident_records === 0 ? 'No Records Reported' : `${p.accident_records} record(s) found`) : 'Locked',
      status: p.accident_records != null ? (p.accident_records === 0 ? 'ok' : 'warn') : 'lock',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      label: 'Insurance Records',
      value: p.insurance_records != null ? (p.insurance_records === 0 ? 'No Records Reported' : `${p.insurance_records} record(s) found`) : 'Locked',
      status: p.insurance_records != null ? (p.insurance_records === 0 ? 'ok' : 'warn') : 'lock',
    },
    {
      icon: <Link2 className="w-6 h-6" />,
      label: 'Lien & Impound',
      value: p.lien_records != null ? (p.lien_records === 0 ? 'No Records Reported' : `${p.lien_records} record(s) found`) : 'Locked',
      status: p.lien_records != null ? (p.lien_records === 0 ? 'ok' : 'warn') : 'lock',
    },
  ];

  const selected = bundles.find((b) => b.id === selectedBundle)!;
  const hasCredits = credits?.has_credits && (credits?.total_remaining ?? 0) > 0;
  const hasExistingReport = !!existingReport;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Report header — mimics ClearVin style */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          {/* Top bar */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Vehicle History Report For</p>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">VIN# {vin}</h1>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <ShieldCheck className="w-4 h-4 text-ch-blue" />
                <span className="text-xs font-bold text-ch-blue">CLEARVIN</span>
              </div>
            </div>
          </div>

          {/* Vehicle image + basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {/* Image */}
            <div className="relative bg-slate-100 min-h-[200px] flex items-center justify-center">
              {p.preview_image ? (
                <img
                  src={`/api/proxy/image?url=${encodeURIComponent(p.preview_image)}`}
                  alt={`${preview.year} ${preview.make} ${preview.model}`}
                  className="w-full h-full object-cover max-h-64"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="text-slate-400 text-center p-8">
                  <Car className="w-16 h-16 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Preview Only</p>
                </div>
              )}
              {p.images_count && p.images_count > 0 && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  📸 {p.images_count} auction photos
                </div>
              )}
            </div>

            {/* Vehicle info */}
            <div className="p-5 space-y-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{preview.year} {preview.make} {preview.model}</h2>
                {preview.trim && <p className="text-sm text-slate-500">{preview.trim}</p>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Report ID:</span>
                  <span className="font-semibold text-slate-700">PREVIEW-MODE</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {recallCount > 0 && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Recalls:</span>
                    <span className="font-semibold text-amber-600">⚠ {recallCount} found</span>
                  </div>
                )}
              </div>

              {/* Rating placeholder */}
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                <Lock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500 font-medium">ClearVin Vehicle Rating</p>
                <p className="text-xs text-slate-400">Unlock full report to view</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Report Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className={`relative rounded-xl border p-3 text-center transition-all ${
                  card.status === 'warn'
                    ? 'border-amber-200 bg-amber-50'
                    : card.status === 'lock'
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-green-200 bg-green-50'
                }`}
              >
                {/* Status badge */}
                <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  card.status === 'warn' ? 'bg-amber-500 text-white' :
                  card.status === 'lock' ? 'bg-slate-300 text-slate-500' :
                  'bg-green-500 text-white'
                }`}>
                  {card.status === 'warn' ? '!' : card.status === 'lock' ? '–' : '✓'}
                </div>
                <div className={`mx-auto mb-2 w-8 h-8 flex items-center justify-center rounded-full ${
                  card.status === 'warn' ? 'text-amber-600' :
                  card.status === 'lock' ? 'text-slate-400' :
                  'text-green-600'
                }`}>
                  {card.icon}
                </div>
                <p className="text-[11px] font-semibold text-slate-700 leading-tight mb-1">{card.label}</p>
                {card.status === 'lock' ? (
                  <p className="text-[10px] leading-tight text-slate-300 select-none blur-[3px]">
                    X record(s) found
                  </p>
                ) : (
                  <p className={`text-[10px] leading-tight ${
                    card.status === 'warn' ? 'text-amber-700' : 'text-green-700'
                  }`}>{card.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Specs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
            Vehicle Specifications <span className="text-slate-400 font-normal normal-case">(free)</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Make', value: preview.make }, { label: 'Model', value: preview.model },
              { label: 'Year', value: preview.year?.toString() }, { label: 'Engine', value: preview.engine },
              { label: 'Fuel Type', value: preview.fuel_type }, { label: 'Drive Type', value: preview.drive_type },
              { label: 'Body Type', value: preview.body_type }, { label: 'Doors', value: preview.doors?.toString() },
              { label: 'Manufactured', value: preview.country_of_manufacture },
            ].map((spec) => spec.value && (
              <div key={spec.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">{spec.label}</p>
                <p className="text-sm font-semibold text-slate-800">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA — Unlock Full Report */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 mb-3">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Full History Analysis Available</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Unlock the Complete Report</h2>
            <p className="text-sm text-slate-500">Auction photos, title records, accident history & more</p>
          </div>

          {/* Existing report */}
          {hasExistingReport && (
            <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
              <div>
                <p className="text-sm font-semibold text-green-700">You already have a report for this car</p>
                <p className="text-xs text-green-600/70">{existingReport!.status === 'COMPLETED' ? 'Ready to view' : 'Being generated'}</p>
              </div>
              <Button size="sm" onClick={() => router.push(`/reports/${existingReport!.report_id}`)} className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                View Report
              </Button>
            </div>
          )}

          {/* Credits */}
          {!hasExistingReport && hasCredits && (
            <div className="flex items-center gap-2 bg-ch-blue-light border border-blue-200 rounded-xl px-4 py-3 mb-4">
              <Zap className="w-4 h-4 text-ch-blue shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ch-blue">{credits!.total_remaining} report credit{credits!.total_remaining > 1 ? 's' : ''} available</p>
                <p className="text-xs text-ch-blue/70">No payment needed — uses 1 credit</p>
              </div>
            </div>
          )}

          {/* Bundle selector */}
          {!hasCredits && !hasExistingReport && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {bundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    onClick={() => setSelectedBundle(bundle.id)}
                    className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                      selectedBundle === bundle.id ? 'border-ch-blue bg-ch-blue-light' : 'border-slate-200 hover:border-ch-blue/40'
                    }`}
                  >
                    {bundle.badge && (
                      <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        bundle.highlight ? 'bg-ch-blue text-white' : 'bg-amber-500 text-white'
                      }`}>{bundle.badge}</span>
                    )}
                    <p className="text-xs font-semibold text-slate-700 mb-1">{bundle.label}</p>
                    <p className="text-base font-bold text-ch-blue">₦{bundle.price.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400">₦{bundle.perReport.toLocaleString()}/report</p>
                    {bundle.saving && <p className="text-[11px] font-semibold text-green-600 mt-1">{bundle.saving}</p>}
                    {selectedBundle === bundle.id && <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-ch-blue" />}
                  </button>
                ))}
              </div>
              {selected.saving && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                  <Zap className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 font-medium">You save {selected.saving} — use reports one at a time for any car</p>
                </div>
              )}
            </>
          )}

          <Button
            onClick={handleOrder}
            disabled={ordering}
            className="w-full h-12 bg-ch-blue hover:bg-ch-blue-dark text-white text-base font-semibold rounded-xl"
          >
            {ordering ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> :
             hasExistingReport ? 'View Your Report' :
             hasCredits ? 'Use 1 Credit — Check This Car' :
             session?.user ? `Get Full Report — ₦${selected.price.toLocaleString()}` :
             `Sign In to Get Report — ₦${selected.price.toLocaleString()}`}
          </Button>

          <div className="flex items-center justify-center gap-2 mt-3">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <p className="text-xs text-slate-400">Secured by Paystack · Visa / Mastercard / Bank Transfer / USSD</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <strong>NMVTIS Notice:</strong> This report is obtained from the National Motor Vehicle Title Information System (NMVTIS).
              Federal law requires NMVTIS data providers to notify you that not all states submit data to NMVTIS,
              and absence of information does not mean absence of a problem. Reports are for internal use only.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
