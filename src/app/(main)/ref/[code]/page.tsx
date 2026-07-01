'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, TrendingUp, MousePointerClick, ShoppingCart, Wallet, Clock, Copy, CheckCheck } from 'lucide-react';

type Stats = {
  code: string;
  name: string;
  clicks: number;
  total_sales: number;
  total_commission_ngn: number;
  unpaid_commission_ngn: number;
};

export default function ReferralDashboard() {
  const { code } = useParams<{ code: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const referralLink = `https://carhaki.com/?ref=${code?.toUpperCase()}`;

  useEffect(() => {
    if (!code) return;
    fetch(`/api/referral/stats/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError('Referral code not found.');
        else setStats(data);
      })
      .catch(() => setError('Failed to load stats. Try again.'))
      .finally(() => setLoading(false));
  }, [code]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (n: number) => '₦' + n.toLocaleString('en-NG');

  if (loading) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-ch-blue border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-sm w-full">
        <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!stats) return null;

  const conversionRate = stats.clicks > 0
    ? ((stats.total_sales / stats.clicks) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="bg-ch-blue rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium uppercase tracking-wide">CarHaki Partner</p>
              <h1 className="text-lg font-bold">{stats.name}</h1>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-white/80 truncate">{referralLink}</p>
            <button onClick={copyLink} className="shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              {copied ? <><CheckCheck className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
        </div>

        {/* Earnings cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
              <Wallet className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Total Earned</p>
            <p className="text-xl font-bold text-slate-900">{fmt(stats.total_commission_ngn)}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Pending Payout</p>
            <p className="text-xl font-bold text-slate-900">{fmt(stats.unpaid_commission_ngn)}</p>
          </div>
        </div>

        {/* Activity stats */}
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <MousePointerClick className="w-4 h-4 text-ch-blue" />
              </div>
              <p className="text-sm text-slate-600">Link Clicks</p>
            </div>
            <p className="text-sm font-bold text-slate-900">{stats.clicks.toLocaleString()}</p>
          </div>

          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-ch-blue" />
              </div>
              <p className="text-sm text-slate-600">Reports Sold</p>
            </div>
            <p className="text-sm font-bold text-slate-900">{stats.total_sales}</p>
          </div>

          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-ch-blue" />
              </div>
              <p className="text-sm text-slate-600">Conversion Rate</p>
            </div>
            <p className="text-sm font-bold text-slate-900">{conversionRate}%</p>
          </div>
        </div>

        {/* Commission breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Commission Per Sale</p>
          <div className="space-y-3">
            {[
              { label: 'Single Report', price: '₦15,000', commission: '₦2,500' },
              { label: 'Triple Pack', price: '₦45,000', commission: '₦5,000' },
              { label: 'Five Pack', price: '₦75,000', commission: '₦7,500' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.price}</p>
                </div>
                <span className="text-sm font-bold text-green-600">{item.commission}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Payouts processed monthly to your bank account · CarHaki Partner Program
        </p>

      </div>
    </div>
  );
}
