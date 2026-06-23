'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Copy, Share2, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { Report, Recall } from '@/types/report';

function RiskScore({ score }: { score: number }) {
  const color = score >= 75 ? 'text-ch-green' : score >= 45 ? 'text-ch-amber' : 'text-ch-red';
  const bg = score >= 75 ? 'bg-ch-green-light' : score >= 45 ? 'bg-ch-amber-light' : 'bg-ch-red-light';
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-1">Risk Score</p>
      <p className={`text-4xl font-extrabold ${color}`}>{score}</p>
      <p className="text-xs text-ch-text-muted">out of 100</p>
    </div>
  );
}

function RecallCard({ recall }: { recall: Recall }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-ch-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{recall.recall_number}</code>
          <Badge className={recall.is_open ? 'bg-ch-red-light text-ch-red border-0 text-xs' : 'bg-ch-green-light text-ch-green border-0 text-xs'}>
            {recall.is_open ? 'OPEN' : 'RESOLVED'}
          </Badge>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-ch-text-muted hover:text-ch-text">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs font-medium text-ch-text-secondary uppercase tracking-wide mb-1">{recall.component}</p>
      <p className="text-sm text-ch-text-secondary line-clamp-2">{recall.summary}</p>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-ch-border">
          <p className="text-sm text-ch-text-secondary">{recall.summary}</p>
          {recall.remedy && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-ch-text uppercase tracking-wide mb-1">Remedy</p>
              <p className="text-sm text-ch-text-secondary">{recall.remedy}</p>
            </div>
          )}
        </div>
      )}
    </div>
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

  const data = report.processed_data;
  const vehicle = data?.vehicle;
  const recalls = data?.recalls || [];
  const accidents = data?.accidents || [];
  const theft = data?.theft || [];
  const odometer = data?.odometer_records || [];

  const gradeColor =
    report.overall_grade === 'A' ? 'bg-ch-green text-white' :
    report.overall_grade === 'B' ? 'bg-ch-blue text-white' :
    report.overall_grade === 'C' ? 'bg-ch-amber text-white' : 'bg-ch-red text-white';

  const verdictBorder =
    ['A', 'B'].includes(report.overall_grade) ? 'border-l-ch-green' :
    report.overall_grade === 'C' ? 'border-l-ch-amber' : 'border-l-ch-red';

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-ch-blue font-semibold mb-1">US Vehicle History Report</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-ch-text">
                {String(vehicle?.year ?? '')} {String(vehicle?.make ?? '')} {String(vehicle?.model ?? '')}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <code className="text-xs font-mono text-ch-text-muted bg-slate-100 px-2 py-1 rounded">{report.vin}</code>
                <span className="text-xs text-ch-text-muted">
                  Generated {new Date(report.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor}`}>Grade {report.overall_grade}</span>
              </div>
            </div>
            <RiskScore score={report.risk_score} />
          </div>

          <div className="mt-4 pt-4 border-t border-ch-border flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copyLink} className="border-ch-border text-xs gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <a href={`https://wa.me/?text=CarHaki Report: ${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="border-ch-border text-xs gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </Button>
            </a>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="border-ch-border text-xs gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          </div>
        </div>

        {/* Verdict */}
        <div className={`bg-white border border-ch-border border-l-4 ${verdictBorder} rounded-2xl p-5`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${gradeColor}`}>
              {report.overall_grade}
            </div>
            <div>
              <p className="font-semibold text-ch-text">
                {['A', 'B'].includes(report.overall_grade) ? 'Looking Good — Inspect Before Buying' :
                 report.overall_grade === 'C' ? 'Issues Found — Review Carefully' : 'Significant Issues — Exercise Caution'}
              </p>
              <p className="text-sm text-ch-text-secondary">
                {['A', 'B'].includes(report.overall_grade)
                  ? 'No major issues in available USA records. Always conduct a physical inspection.'
                  : 'Review all sections below carefully before purchasing.'}
              </p>
            </div>
          </div>
        </div>

        {/* Vehicle Specs */}
        {vehicle && (
          <div className="bg-white border border-ch-border rounded-2xl p-6">
            <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
              Vehicle Specifications
              <Badge className="bg-ch-blue-light text-ch-blue border-0 text-xs">🇺🇸 USA</Badge>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Make', value: vehicle.make },
                { label: 'Model', value: vehicle.model },
                { label: 'Year', value: vehicle.year?.toString() },
                { label: 'Engine', value: vehicle.engine },
                { label: 'Fuel Type', value: vehicle.fuel_type },
                { label: 'Drive Type', value: vehicle.drive_type },
                { label: 'Body Type', value: vehicle.body_type },
                { label: 'Doors', value: vehicle.doors?.toString() },
                { label: 'Manufactured In', value: vehicle.country_of_manufacture },
              ].map((spec) => spec.value && (
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
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            NHTSA Safety Recalls
            <Badge className={recalls.length > 0 ? 'bg-ch-amber-light text-ch-amber border-0 text-xs' : 'bg-ch-green-light text-ch-green border-0 text-xs'}>
              {recalls.length > 0 ? `${recalls.length} recall(s)` : 'No recalls'}
            </Badge>
          </h2>
          {recalls.length === 0 ? (
            <div className="bg-ch-green-light rounded-lg p-4">
              <p className="text-ch-green font-semibold text-sm">✓ No open safety recalls</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recalls.map((recall, i) => <RecallCard key={i} recall={recall} />)}
            </div>
          )}
        </div>

        {/* Accidents */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            Accident History
            <Badge className={accidents.length > 0 ? 'bg-ch-red-light text-ch-red border-0 text-xs' : 'bg-ch-green-light text-ch-green border-0 text-xs'}>
              {accidents.length > 0 ? `${accidents.length} accident(s)` : 'No accidents'}
            </Badge>
          </h2>
          {accidents.length === 0 ? (
            <div className="bg-ch-green-light rounded-lg p-4">
              <p className="text-ch-green font-semibold text-sm">✓ No accident history found</p>
              <p className="text-xs text-ch-green mt-0.5">No recorded accidents in USA government and insurance databases</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(accidents as Record<string, unknown>[]).map((acc, i) => (
                <div key={i} className="border border-ch-red rounded-lg p-3 bg-ch-red-light">
                  <p className="text-sm font-medium text-ch-red">{String(acc.type ?? 'Accident recorded')}</p>
                  <p className="text-xs text-ch-text-secondary mt-0.5">{String(acc.date ?? '')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Odometer */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            Odometer History
            <Badge className={odometer.length > 0 ? 'bg-ch-amber-light text-ch-amber border-0 text-xs' : 'bg-ch-green-light text-ch-green border-0 text-xs'}>
              {odometer.length > 0 ? `${odometer.length} records` : 'Clean'}
            </Badge>
          </h2>
          {odometer.length === 0 ? (
            <div className="bg-ch-green-light rounded-lg p-4">
              <p className="text-ch-green font-semibold text-sm">✓ No odometer discrepancies found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(odometer as Record<string, unknown>[]).map((record, i) => (
                <div key={i} className="flex justify-between text-sm border border-ch-border rounded-lg p-3">
                  <span className="text-ch-text-secondary">{String(record.date ?? 'Unknown date')}</span>
                  <span className="font-medium text-ch-text">{String(record.reading ?? '—')} miles</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theft */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            Theft Records
            <Badge className={theft.length > 0 ? 'bg-ch-red-light text-ch-red border-0 text-xs' : 'bg-ch-green-light text-ch-green border-0 text-xs'}>
              {theft.length > 0 ? `${theft.length} record(s)` : 'Clean'}
            </Badge>
          </h2>
          {theft.length === 0 ? (
            <div className="bg-ch-green-light rounded-lg p-4">
              <p className="text-ch-green font-semibold text-sm">✓ No theft records</p>
              <p className="text-xs text-ch-green mt-0.5">Not reported stolen in USA databases</p>
            </div>
          ) : (
            <div className="bg-ch-red-light border border-ch-red rounded-lg p-4">
              <p className="text-ch-red font-semibold text-sm">⚠ Theft record found</p>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-slate-50 border border-ch-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-ch-text mb-1">Report Disclaimer</p>
          <p className="text-xs text-ch-text-muted leading-relaxed">
            This report is generated from NHTSA and US state records. CarHaki provides this information in good faith but cannot guarantee completeness.
            Always conduct a physical inspection by a qualified mechanic before purchasing any vehicle.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pb-4">
          <Button variant="outline" onClick={() => router.push('/search')} className="border-ch-border text-ch-text-secondary">← Check Another Car</Button>
          <Button variant="outline" onClick={() => window.print()} className="border-ch-border text-ch-text-secondary">Print Report</Button>
        </div>

      </div>
    </div>
  );
}
