import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, FileText } from 'lucide-react';

export const metadata = {
  title: 'Sample Report — CarHaki',
  description: 'See a real CarHaki vehicle history report before you buy.',
};

export default function SampleReportPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">

        <div className="w-14 h-14 bg-ch-blue/10 rounded-2xl flex items-center justify-center mx-auto">
          <FileText className="w-7 h-7 text-ch-blue" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Sample CarHaki Report</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            This is a real vehicle history report for a <strong className="text-slate-700">2015 Toyota Highlander</strong> — exactly what you receive after payment.
          </p>
        </div>

        <a href="/sample-report.pdf" target="_blank" rel="noopener noreferrer" className="block">
          <Button className="bg-ch-blue hover:bg-ch-blue-dark text-white w-full h-12 text-base font-semibold">
            View Sample Report (PDF)
          </Button>
        </a>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-500 mb-4">Ready to check your own car?</p>
          <Link href="/">
            <Button variant="outline" className="w-full h-11 font-semibold border-slate-200">
              Check a VIN — ₦15,000
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <p className="text-xs text-slate-400">Powered by ClearVin · Secured by Paystack</p>
        </div>

      </div>
    </div>
  );
}
