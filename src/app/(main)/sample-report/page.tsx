import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ShieldCheck } from 'lucide-react';

const sampleReport = {
  vin: '1HGCM82633A004352',
  make: 'HONDA', model: 'Accord', year: 2003,
  trim: 'EX', engine: '3.0L', fuel_type: 'Gasoline',
  drive_type: 'FWD', body_type: 'Sedan', doors: 4,
  country_of_manufacture: 'United States (USA)',
  grade: 'B', score: 82, grade_label: 'Good', grade_colour: '#2563eb',
  recalls: [
    {
      recall_number: '14V-594',
      component: 'AIR BAGS:FRONTAL:INFLATOR MODULE',
      summary: 'Honda is recalling certain model year 2001-2007 Accord vehicles. The affected vehicles may have Takata driver frontal air bag inflators that may rupture.',
      remedy: 'Honda will notify owners, and dealers will replace the driver frontal air bag inflator, free of charge.',
      is_open: false,
    },
  ],
  accidents: [],
  theft: [],
  odometer: [
    { date: '2010-03-15', reading: '45,230 miles' },
    { date: '2014-07-22', reading: '89,540 miles' },
    { date: '2018-11-08', reading: '134,780 miles' },
  ],
};

export default function SampleReportPage() {
  const gradeColor = 'bg-ch-blue text-white';
  const verdictBorder = 'border-l-ch-blue';

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Sample banner */}
        <div className="bg-ch-amber-light border border-ch-amber rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-ch-amber text-lg">📋</span>
          <div>
            <p className="text-sm font-semibold text-ch-amber">This is a sample report</p>
            <p className="text-xs text-ch-amber/80">Showing what a real CarHaki report looks like. Data is real — from NHTSA records.</p>
          </div>
        </div>

        {/* Header */}
        <div className="bg-ch-navy text-white rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-ch-blue font-semibold mb-1">US Vehicle History Report</p>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {sampleReport.year} {sampleReport.make} {sampleReport.model}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <code className="text-xs font-mono text-slate-400 bg-slate-700 px-2 py-1 rounded">{sampleReport.vin}</code>
                <span className="text-xs text-slate-400">Generated {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor}`}>Grade {sampleReport.grade}</span>
              </div>
            </div>
            <div className="bg-ch-blue-light rounded-xl p-4 text-center shrink-0">
              <p className="text-xs uppercase tracking-wide text-ch-blue mb-1">Risk Score</p>
              <p className="text-4xl font-extrabold text-ch-blue">{sampleReport.score}</p>
              <p className="text-xs text-ch-text-muted">out of 100</p>
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div className={`bg-white border border-ch-border border-l-4 ${verdictBorder} rounded-2xl p-5`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${gradeColor}`}>
              {sampleReport.grade}
            </div>
            <div>
              <p className="font-semibold text-ch-text">Good — Inspect Before Buying</p>
              <p className="text-sm text-ch-text-secondary">No major structural issues found. One resolved recall on record. Always conduct a physical inspection.</p>
            </div>
          </div>
        </div>

        {/* Specs */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            Vehicle Specifications <Badge className="bg-ch-blue-light text-ch-blue border-0 text-xs">🇺🇸 USA</Badge>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Make', value: sampleReport.make },
              { label: 'Model', value: sampleReport.model },
              { label: 'Year', value: sampleReport.year },
              { label: 'Engine', value: sampleReport.engine },
              { label: 'Fuel Type', value: sampleReport.fuel_type },
              { label: 'Drive Type', value: sampleReport.drive_type },
              { label: 'Body Type', value: sampleReport.body_type },
              { label: 'Doors', value: sampleReport.doors },
              { label: 'Manufactured In', value: sampleReport.country_of_manufacture },
            ].map((spec) => (
              <div key={spec.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-0.5">{spec.label}</p>
                <p className="text-sm font-semibold text-ch-text">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recalls */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            NHTSA Safety Recalls
            <Badge className="bg-ch-amber-light text-ch-amber border-0 text-xs">1 recall</Badge>
          </h2>
          {sampleReport.recalls.map((recall) => (
            <div key={recall.recall_number} className="border border-ch-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{recall.recall_number}</code>
                <Badge className="bg-ch-green-light text-ch-green border-0 text-xs">RESOLVED</Badge>
              </div>
              <p className="text-xs font-medium text-ch-text-secondary uppercase tracking-wide mb-1">{recall.component}</p>
              <p className="text-sm text-ch-text-secondary">{recall.summary}</p>
              <div className="mt-3 pt-3 border-t border-ch-border">
                <p className="text-xs font-semibold text-ch-text uppercase tracking-wide mb-1">Remedy</p>
                <p className="text-sm text-ch-text-secondary">{recall.remedy}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Accidents */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            Accident History
            <Badge className="bg-ch-green-light text-ch-green border-0 text-xs">No accidents</Badge>
          </h2>
          <div className="bg-ch-green-light rounded-lg p-4">
            <p className="text-ch-green font-semibold text-sm">✓ No accident history found</p>
            <p className="text-xs text-ch-green mt-0.5">No recorded accidents in USA government and insurance databases</p>
          </div>
        </div>

        {/* Odometer */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            Odometer History
            <Badge className="bg-ch-blue-light text-ch-blue border-0 text-xs">{sampleReport.odometer.length} records</Badge>
          </h2>
          <div className="space-y-2">
            {sampleReport.odometer.map((record, i) => (
              <div key={i} className="flex justify-between text-sm border border-ch-border rounded-lg p-3">
                <span className="text-ch-text-secondary">{record.date}</span>
                <span className="font-medium text-ch-text">{record.reading}</span>
              </div>
            ))}
          </div>
          <div className="bg-ch-green-light rounded-lg p-3 mt-3">
            <p className="text-ch-green font-semibold text-sm">✓ No odometer discrepancies — mileage progression is consistent</p>
          </div>
        </div>

        {/* Theft */}
        <div className="bg-white border border-ch-border rounded-2xl p-6">
          <h2 className="font-semibold text-ch-text mb-4 flex items-center justify-between">
            Theft Records
            <Badge className="bg-ch-green-light text-ch-green border-0 text-xs">Clean</Badge>
          </h2>
          <div className="bg-ch-green-light rounded-lg p-4">
            <p className="text-ch-green font-semibold text-sm">✓ No theft records</p>
            <p className="text-xs text-ch-green mt-0.5">Not reported stolen in USA databases</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-ch-navy text-white rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to check your car?</h2>
          <p className="text-slate-400 text-sm mb-5">Get a full report like this for any Tokunbo car in seconds.</p>
          <Link href="/search">
            <Button className="bg-ch-blue hover:bg-ch-blue-dark text-white px-8 h-12 text-base font-semibold">
              Check a VIN — ₦15,000
            </Button>
          </Link>
          <div className="flex items-center justify-center gap-2 mt-3">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <p className="text-xs text-slate-500">Secured by Paystack · Money-back if no data found</p>
          </div>
        </div>

      </div>
    </div>
  );
}
