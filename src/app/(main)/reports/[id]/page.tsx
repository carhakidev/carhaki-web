'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Copy, Share2, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

interface Report {
  id: string;
  vin: string;
  status: string;
  overall_grade: string;
  risk_score: number;
  grade_label: string;
  processed_data: {
    clearvin_html?: string;
    clearvin_report_id?: string;
    data_source?: string;
    vehicle?: Record<string, unknown>;
    recalls?: unknown[];
    accidents?: unknown[];
    theft?: unknown[];
    odometer_records?: unknown[];
  } | null;
  created_at: string;
}


function ClearVinFrame({ html }: { html: string }) {
  const [height, setHeight] = useState(800);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;

    const handleLoad = () => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          setHeight(doc.documentElement.scrollHeight + 50);
        }
      } catch { /* cross-origin */ }
    };

    iframeRef.current.addEventListener('load', handleLoad);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      style={{ width: '100%', height: `${height}px`, border: 'none' }}
      title="Vehicle History Report"
      sandbox="allow-same-origin allow-scripts"
    />
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { status } = useSession();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated' && id) {
      fetch(`/api/reports/${id}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then(setReport)
        .catch(() => router.push('/dashboard'))
        .finally(() => setLoading(false));
    }
  }, [status, id, router]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-ch-bg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ch-blue" /></div>;
  }
  if (!report) return null;

  const isClearVin = report.processed_data?.data_source === 'CLEARVIN' && report.processed_data?.clearvin_html;
  const clearvinHtml = report.processed_data?.clearvin_html || '';

  // ClearVin report — render in iframe to isolate ClearVin's full HTML page
  if (isClearVin) {
    return (
      <div className="min-h-screen bg-ch-bg flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-ch-border sticky top-0 z-10 print:hidden">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="border-ch-border gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Button>
              <div>
                <p className="text-sm font-semibold text-ch-text">{report.vin}</p>
                <p className="text-xs text-ch-text-muted">
                  {new Date(report.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={copyLink} className="border-ch-border text-xs gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <a href={`https://wa.me/?text=CarHaki Report: ${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="border-ch-border text-xs gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
              </a>
              <Button size="sm" variant="outline" onClick={() => window.print()} className="border-ch-border text-xs gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
            </div>
          </div>
        </div>

        {/* ClearVin HTML in iframe — isolates their full page structure */}
        <ClearVinFrame html={clearvinHtml} />

        {/* NMVTIS Disclaimer */}
        <div className="max-w-4xl mx-auto px-4 py-6 print:hidden">
          <div className="bg-slate-50 border border-ch-border rounded-xl p-4 text-xs text-ch-text-muted leading-relaxed">
            <p className="font-semibold text-ch-text mb-1">NMVTIS Disclaimer</p>
            <p>Federal law requires that we notify you that this report was obtained from the National Motor Vehicle Title Information System (NMVTIS). NMVTIS information is provided by states, insurance companies, and salvage yards. Not all states supply information to NMVTIS. The absence of information does not necessarily mean the absence of a problem. Always verify a vehicle&apos;s history with the appropriate state agency or other sources.</p>
          </div>
        </div>
      </div>
    );
  }

  // NHTSA fallback report display
  const data = report.processed_data;
  const vehicle = data?.vehicle || {};
  const recalls = data?.recalls || [];
  const accidents = data?.accidents || [];
  const theft = data?.theft || [];
  const odometer = data?.odometer_records || [];

  const gradeColor = report.overall_grade === 'A' ? 'bg-ch-green text-white' :
    report.overall_grade === 'B' ? 'bg-ch-blue text-white' :
    report.overall_grade === 'C' ? 'bg-ch-amber text-white' : 'bg-ch-red text-white';

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-ch-blue font-semibold mb-1">US Vehicle History Report</p>
              <h1 className="text-2xl font-bold text-ch-text">
                {String(vehicle?.year ?? '')} {String(vehicle?.make ?? '')} {String(vehicle?.model ?? '')}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <code className="text-xs font-mono text-ch-text-muted bg-slate-100 px-2 py-1 rounded">{report.vin}</code>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor}`}>Grade {report.overall_grade}</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center shrink-0">
              <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-1">Risk Score</p>
              <p className="text-3xl font-extrabold text-ch-blue">{report.risk_score}</p>
              <p className="text-xs text-ch-text-muted">out of 100</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-ch-border flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copyLink} className="border-ch-border text-xs gap-1.5">
              <Copy className="w-3.5 h-3.5" />{copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="border-ch-border text-xs gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          </div>
        </div>

        {/* Specs */}
        {vehicle && Object.keys(vehicle).length > 0 && (
          <div className="bg-white border border-ch-border rounded-2xl p-6">
            <h2 className="font-semibold text-ch-text mb-4">Vehicle Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([
                { label: 'Make', value: vehicle.make },
                { label: 'Model', value: vehicle.model },
                { label: 'Year', value: vehicle.year?.toString() },
                { label: 'Engine', value: vehicle.engine },
                { label: 'Fuel Type', value: vehicle.fuel_type },
                { label: 'Drive Type', value: vehicle.drive_type },
                { label: 'Body Type', value: vehicle.body_type },
                { label: 'Doors', value: vehicle.doors?.toString() },
                { label: 'Manufactured In', value: vehicle.country_of_manufacture },
              ] as { label: string; value: string | undefined }[]).map((spec) => spec.value && (
                <div key={spec.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-0.5">{spec.label}</p>
                  <p className="text-sm font-semibold text-ch-text">{String(spec.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recalls */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4">NHTSA Safety Recalls ({recalls.length})</h2>
          {recalls.length === 0 ? (
            <div className="bg-ch-green-light rounded-lg p-4"><p className="text-ch-green font-semibold text-sm">✓ No open safety recalls</p></div>
          ) : (
            <div className="space-y-3">
              {(recalls as Record<string, unknown>[]).map((r, i) => (
                <div key={i} className="border border-ch-border rounded-lg p-4">
                  <p className="text-xs font-medium text-ch-text-secondary uppercase mb-1">{String(r.component || '')}</p>
                  <p className="text-sm text-ch-text-secondary">{String(r.summary || '')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NMVTIS Disclaimer */}
        <div className="bg-slate-50 border border-ch-border rounded-xl p-4 text-xs text-ch-text-muted">
          <p className="font-semibold text-ch-text mb-1">NMVTIS Disclaimer</p>
          <p>This report was obtained from NMVTIS. Not all states supply information to NMVTIS. Always verify a vehicle's history with the appropriate state agency.</p>
        </div>

        <div className="flex gap-3 pb-4">
          <Button variant="outline" onClick={() => router.push('/search')} className="border-ch-border">← Check Another Car</Button>
          <Button variant="outline" onClick={() => window.print()} className="border-ch-border">Print Report</Button>
        </div>
      </div>
    </div>
  );
}
