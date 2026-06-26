'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

export default function SampleReportPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Sample banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700">This is a real sample report</p>
            <p className="text-xs text-amber-600/80">Actual data from a 2013 Toyota Sienna Tokunbo car — exactly what you get when you order a CarHaki report.</p>
          </div>
        </div>

        {/* Header card */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Vehicle History Report For</p>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">VIN# 5TDYK3DC8DS290235</h1>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <ShieldCheck className="w-4 h-4 text-ch-blue" />
                <span className="text-xs font-bold text-ch-blue">CLEARVIN</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {/* Image */}
            <div className="bg-slate-100 min-h-[200px] flex items-center justify-center overflow-hidden">
              <img
                src="/api/proxy/image?url=https%3A%2F%2Fcdn.clearvin.com%2Fvehicle-images%2F5TDYK3DC8DS290235%2Fmain.jpg"
                alt="2013 Toyota Sienna"
                className="w-full h-full object-cover max-h-64"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-48 text-slate-400 text-sm">📸 Auction photo</div>';
                }}
              />
            </div>

            {/* Info */}
            <div className="p-5 space-y-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">2013 Toyota Sienna</h2>
                <p className="text-sm text-slate-500">XLE FWD 8-Passenger V6</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Report ID:</span>
                  <span className="font-semibold text-slate-700">08F23EA3</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Generated:</span>
                  <span className="font-semibold text-slate-700">Jun 26, 2026</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Odometer:</span>
                  <span className="font-semibold text-slate-700">36,051 Miles</span>
                </div>
              </div>
              {/* ClearVin Rating */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 font-medium mb-0.5">ClearVin Vehicle Rating</p>
                <p className="text-2xl font-black text-red-600">D — Bad</p>
                <p className="text-[10px] text-red-500">High risk vehicle</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Report Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: 'Ownership History', value: 'No Records', status: 'ok' },
              { label: 'Odometer Reading', value: '36,051 M', status: 'ok' },
              { label: 'Title History', value: '6 records', status: 'warn' },
              { label: 'Recalls', value: '6 records', status: 'warn' },
              { label: 'Sale History', value: '5 records', status: 'warn' },
              { label: 'Junk & Salvage', value: '3 records', status: 'warn' },
              { label: 'Title Brands', value: '3 records', status: 'warn' },
              { label: 'Accident & Damage', value: '2 records', status: 'warn' },
              { label: 'Insurance Records', value: '1 record', status: 'warn' },
              { label: 'Lien & Impound', value: 'No Records', status: 'ok' },
            ].map((card) => (
              <div key={card.label} className={`relative rounded-xl border p-3 text-center ${
                card.status === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
              }`}>
                <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  card.status === 'warn' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                }`}>
                  {card.status === 'warn' ? '!' : '✓'}
                </div>
                <p className="text-[11px] font-semibold text-slate-700 leading-tight mb-1">{card.label}</p>
                <p className={`text-[10px] leading-tight font-medium ${
                  card.status === 'warn' ? 'text-amber-700' : 'text-green-700'
                }`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key findings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">⚠️ Key Findings — What This Report Revealed</h3>
          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Salvage & Rebuilt Title</p>
                <p className="text-xs text-red-600 mt-0.5">This car has a Salvage title (California, Nov 2017) and a Rebuilt title (Utah, Sep 2019). It was declared a total loss by an insurer and later repaired.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Front End Damage at Auction</p>
                <p className="text-xs text-red-600 mt-0.5">Sold at IAAI auction (Sep 2017) with Primary Damage: FRONT END and Secondary Damage: MECHANICAL. Seller was Mercury Insurance — total loss vehicle.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">3 Junk & Salvage Records</p>
                <p className="text-xs text-red-600 mt-0.5">Records found at COPART (Dallas, TX), IAAI (Westchester, IL), and Mercury Insurance Group — confirming this vehicle was salvaged multiple times.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700">6 Active Safety Recalls</p>
                <p className="text-xs text-amber-600 mt-0.5">This vehicle has 6 NHTSA safety recalls on record. These may be unresolved and pose a safety risk to the driver and passengers.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700">Odometer: Possibly Altered (Not Actual)</p>
                <p className="text-xs text-amber-600 mt-0.5">A "Not Actual" odometer brand was reported, meaning the recorded mileage (36,051 M) may not reflect the true mileage of the vehicle.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-700">Not Listed as Stolen</p>
                <p className="text-xs text-green-600 mt-0.5">No theft records found in US government databases.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sale history */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Sale History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs text-slate-500 pb-2 font-medium">Date</th>
                  <th className="text-left text-xs text-slate-500 pb-2 font-medium">Event</th>
                  <th className="text-right text-xs text-slate-500 pb-2 font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { date: 'Aug 6, 2017', event: 'Put up for sale', price: '$24,212' },
                  { date: 'Nov 6, 2017', event: 'Put up for sale', price: '—' },
                  { date: 'Nov 16, 2017', event: 'Sold', price: '$2,800' },
                  { date: 'Nov 26, 2017', event: 'Put up for sale', price: '—' },
                  { date: 'Dec 28, 2017', event: 'Sold', price: '$11,700' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 text-slate-500 text-xs">{row.date}</td>
                    <td className="py-2 text-slate-700 font-medium text-xs">{row.event}</td>
                    <td className="py-2 text-right text-slate-700 text-xs font-mono">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Note: This car dropped in value from $24,212 to $2,800 after the accident — a clear sign of severe damage.</p>
        </div>

        {/* Specs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Vehicle Specifications</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Make', value: 'Toyota' }, { label: 'Model', value: 'Sienna' },
              { label: 'Year', value: '2013' }, { label: 'Trim', value: 'XLE FWD 8-Passenger V6' },
              { label: 'Engine', value: '3.5L V6 EFI DOHC 24V' }, { label: 'Transmission', value: '5-Speed Automatic' },
              { label: 'Body Type', value: 'Sports Van' }, { label: 'Seating', value: '8 passengers' },
              { label: 'Manufactured', value: 'United States' },
            ].map((spec) => (
              <div key={spec.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">{spec.label}</p>
                <p className="text-sm font-semibold text-slate-800">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Verdict box */}
        <div className="bg-red-600 text-white rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-2">🚨 CarHaki Verdict: Do Not Buy This Car</h3>
          <p className="text-sm text-red-100 leading-relaxed">
            This 2013 Toyota Sienna has a salvage and rebuilt title, front-end collision damage, 3 junk records,
            6 safety recalls, and a possibly altered odometer. If this car was being sold in Nigeria as a clean Tokunbo,
            the buyer would have no idea. <strong className="text-white">A ₦15,000 CarHaki report just saved you from a potentially dangerous ₦5–10 million mistake.</strong>
          </p>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Check Your Car Before You Buy</h2>
          <p className="text-sm text-slate-500 mb-5">Every Tokunbo car has a history. Know the truth before you pay millions.</p>
          <Link href="/">
            <Button className="bg-ch-blue hover:bg-ch-blue-dark text-white px-8 h-12 text-base font-semibold w-full sm:w-auto">
              Check a VIN — ₦15,000
            </Button>
          </Link>
          <div className="flex items-center justify-center gap-2 mt-3">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <p className="text-xs text-slate-400">Secured by Paystack · Money-back if no data found</p>
          </div>
        </div>

      </div>
    </div>
  );
}
