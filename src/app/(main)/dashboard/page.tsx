'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession, signOut } from 'next-auth/react';
import { DashboardData, ReportListItem } from '@/types/report';

function GradeCircle({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: 'border-ch-green text-ch-green',
    B: 'border-ch-blue text-ch-blue',
    C: 'border-ch-amber text-ch-amber',
    D: 'border-orange-500 text-orange-500',
    E: 'border-ch-red text-ch-red',
    F: 'border-ch-red text-ch-red',
  };
  return (
    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${colors[grade] || 'border-slate-300 text-slate-400'}`}>
      {grade || '—'}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') return <Badge className="bg-ch-green-light text-ch-green border-0 text-xs">Completed</Badge>;
  if (status === 'PROCESSING') return <Badge className="bg-ch-blue-light text-ch-blue border-0 text-xs">Processing</Badge>;
  if (status === 'FAILED') return <Badge className="bg-ch-red-light text-ch-red border-0 text-xs">Failed</Badge>;
  return <Badge className="bg-ch-amber-light text-ch-amber border-0 text-xs">Pending</Badge>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/dashboard')
        .then((r) => r.json())
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-ch-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ch-blue" />
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Total Reports', value: data.stats.total_reports, icon: FileText, color: 'text-ch-text' },
    { label: 'Completed', value: data.stats.completed, icon: CheckCircle, color: 'text-ch-green' },
    { label: 'Pending', value: data.stats.pending, icon: Clock, color: 'text-ch-amber' },
    { label: 'Total Spent', value: `₦${data.stats.total_spent_ngn.toLocaleString()}`, icon: DollarSign, color: 'text-ch-text' },
  ];

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ch-blue mb-1">My Dashboard</p>
            <h1 className="text-2xl font-bold text-ch-text">
              Welcome back, {session?.user?.firstName || data.user.name.split(' ')[0]}
            </h1>
            <p className="text-sm text-ch-text-muted">{data.user.email}</p>
          </div>
          <Link href="/search">
            <Button className="bg-ch-blue hover:bg-ch-blue-dark text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white border border-ch-border rounded-xl p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-ch-text-muted mt-1 uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Reports */}
        <div className="bg-white border border-ch-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ch-border">
            <h2 className="font-semibold text-ch-text">My Reports</h2>
          </div>

          {data.reports.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 text-ch-text-muted mx-auto mb-3" />
              <p className="text-ch-text-secondary font-medium mb-1">No reports yet</p>
              <p className="text-sm text-ch-text-muted mb-4">Check a VIN to get your first report</p>
              <Link href="/search">
                <Button className="bg-ch-blue hover:bg-ch-blue-dark text-white">Check a Car</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ch-border">
              {data.reports.map((report: ReportListItem) => (
                <div key={report.id} className="flex items-center gap-4 px-5 py-4">
                  <GradeCircle grade={report.overall_grade} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ch-text text-sm">US Vehicle Report</p>
                    <p className="text-xs font-mono text-ch-text-muted truncate">{report.vin}</p>
                    <p className="text-xs text-ch-text-muted mt-0.5">
                      {new Date(report.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={report.status} />
                    {report.status === 'COMPLETED' ? (
                      <Link href={`/reports/${report.id}`}>
                        <Button size="sm" variant="outline" className="border-ch-border text-xs">View Report</Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="bg-white border border-ch-border rounded-xl p-5">
          <h2 className="font-semibold text-ch-text mb-4">Account Settings</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Name', value: data.user.name },
              { label: 'Email', value: data.user.email },
              { label: 'Account Type', value: 'Individual' },
              { label: 'Member Since', value: new Date(data.user.member_since).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }) },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-0.5">{item.label}</p>
                <p className="text-sm font-medium text-ch-text">{item.value}</p>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-ch-border text-ch-red hover:text-ch-red"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sign Out
          </Button>
        </div>

      </div>
    </div>
  );
}
