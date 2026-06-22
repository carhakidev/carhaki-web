import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CTASection() {
  return (
    <section className="bg-ch-navy py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Don&apos;t Buy a Tokunbo Blind.
        </h2>
        <p className="text-slate-400 mb-8">One report. Full truth. ₦15,000.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/search">
            <Button className="bg-white text-ch-navy hover:bg-slate-100 font-semibold px-8">
              Check a Car Now
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8">
              See Pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
