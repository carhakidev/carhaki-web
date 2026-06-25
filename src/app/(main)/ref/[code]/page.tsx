'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Copy, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RefStats {
  code: string;
  name: string;
  clicks: number;
  total_sales: number;
  total_commission_ngn: number;
  unpaid_commission_ngn: number;
}

export default function RefPage() {
  const { code } = useParams<{ code: string }>();
  const upperCode = code?.toUpperCase();
  const [stats, setStats] = useState<RefStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const refLink = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${upperCode}`
    : `https://carhaki.com?ref=${upperCode}`;

  useEffect(() => {
    if (!upperCode) return;
    fetch(`/api/referral/stats/${upperCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setNotFound(true);
        else setStats(data);
      })
      .catch(() => setNotFound(true));
  }, [upperCode]);

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (notFound) return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-ch-text-secondary">Referral code not found.</p>
        <Link href="/" className="text-ch-blue hover:underline mt-2 block">Go to CarHaki</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        <div className="bg-ch-navy text-white rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-ch-blue rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {stats ? `${stats.name}'s Dashboard` : 'Loading...'}
          </h1>
          <p className="text-slate-400 text-sm">CarHaki Partner</p>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Clicks', value: stats.clicks, icon: Users, color: 'text-ch-blue' },
                { label: 'Sales', value: stats.total_sales, icon: TrendingUp, color: 'text-ch-green' },
                { label: 'Earned', value: `₦${(stats.total_commission_ngn / 100).toLocaleString()}`, icon: DollarSign, color: 'text-ch-amber' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-ch-border rounded-xl p-4 text-center">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-ch-text-muted uppercase tracking-wide mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {stats.unpaid_commission_ngn > 0 && (
              <div className="bg-ch-green-light border border-green-200 rounded-xl p-4">
                <p className="text-ch-green font-semibold text-sm">
                  ₦{(stats.unpaid_commission_ngn / 100).toLocaleString()} pending payout
                </p>
                <p className="text-xs text-ch-green/70 mt-0.5">Contact CarHaki to arrange payment</p>
              </div>
            )}

            <div className="bg-white border border-ch-border rounded-xl p-5">
              <h2 className="font-semibold text-ch-text mb-3">Your Referral Link</h2>
              <div className="bg-slate-50 rounded-lg p-3 mb-3">
                <p className="text-sm font-mono text-ch-text break-all">{refLink}</p>
              </div>
              <Button onClick={copyLink} className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white gap-2">
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>

            <div className="bg-white border border-ch-border rounded-xl p-5">
              <h2 className="font-semibold text-ch-text mb-3">Commission Structure</h2>
              <div className="space-y-2">
                {[
                  { label: 'Single Report (₦15,000)', commission: '₦2,500' },
                  { label: '3-Report Bundle (₦35,000)', commission: '₦5,000' },
                  { label: '5-Report Bundle (₦50,000)', commission: '₦7,500' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-ch-border last:border-0">
                    <p className="text-sm text-ch-text-secondary">{item.label}</p>
                    <p className="text-sm font-bold text-ch-green">{item.commission}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ch-text-muted mt-3">Payouts via bank transfer. Minimum payout ₦10,000.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
